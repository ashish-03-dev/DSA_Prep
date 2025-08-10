import { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, query, orderBy, deleteField, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseContext';

const FirestoreContext = createContext();
export const useFirestore = () => useContext(FirestoreContext);

export const FirestoreProvider = ({ children }) => {
  const { user, setUserData, userData } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [selectingQuestionLoading, setSelectingQuestionLoading] = useState(true);
  const [goal, setGoal] = useState(null);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [topicProgress, setTopicProgress] = useState({});
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [nextQuestion, setNextQuestion] = useState(null);
  const [error, setError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const updateUserData = async (newData) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, newData);
    } catch (error) {
      console.error('Error updating user data:', error);
      setError(error.message);
    }
  };

  const fetchTopicNames = async () => {
    try {
      if (!goal) return [];

      const goalDocRef = doc(db, 'topics', goal);
      const goalSnap = await getDoc(goalDocRef);

      if (!goalSnap.exists()) {
        throw new Error(`Goal '${goal}' document not found`);
      }

      const topicsArray = goalSnap.data().topics || [];

      // Optional: sort by order if not already sorted
      topicsArray.sort((a, b) => a.order - b.order);

      setTopics(topicsArray);
      return topicsArray;
    } catch (error) {
      console.error('Error fetching topic names:', error);
      setError(error.message);
      setTopics([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicDetails = async (topicId) => {
    try {
      setSelectingQuestionLoading(true);
      setQuestions([]);
      setSelectedQuestion(null);
      setNextQuestion(null);

      const collectionName = goal === 'learn' ? 'learn' : 'practice';
      const topicDocRef = doc(db, collectionName, topicId);
      const topicSnap = await getDoc(topicDocRef);

      if (!topicSnap.exists()) {
        throw new Error(`Topic ${topicId} not found`);
      }

      const progress = await fetchUserProgressByTopic(topicId);
      const questionsData = (topicSnap.data().questions || []).map(question => ({
        id: question.id,
        topicId,
        ...question,
        ...(progress?.[question.id] || {})
      })).sort((a, b) => a.order - b.order);

      setQuestions(questionsData);
      if (questionsData.length === 0) {
        setSelectingQuestionLoading(false);
        return;
      }
      handleUserQuestion(questionsData, progress, topicId);
    } catch (error) {
      console.error('Error fetching topic details:', error);
      setError(error.message);
      setQuestions([]);
      setSelectingQuestionLoading(false);
    }
  };

  const fetchUserProgressByTopic = async (topicId) => {
    if (!user?.uid || !goal || !topicId) {
      console.warn('Invalid input:', { user: !!user?.uid, goal, topicId });
      setTopicProgress({});
      return {};
    }

    try {
      const questionsCollectionRef = collection(db, 'users', user.uid, 'progress', goal, topicId);
      const progressSnap = await getDocs(questionsCollectionRef);

      const progressData = Object.fromEntries(
        progressSnap.docs
          .filter(doc => doc.id !== 'placeholder')
          .map(doc => [doc.id, doc.data()])
      );

      setTopicProgress(progressData);
      return progressData;
    } catch (error) {
      console.error(`Error fetching progress for topic ${topicId}:`, error);
      setTopicProgress({});
      return {};
    }
  };

  const handleSelectQuestion = (question) => {
    if (!question?.id) {
      setSelectedQuestion(null);
      setNextQuestion(null);
      setSelectingQuestionLoading(false);
      return;
    }

    const progress = topicProgress?.[question.id] || {};
    setSelectedQuestion({ ...question, ...progress });
    if (nextQuestion === null || (question.status !== 'Completed' && question.status !== 'Review Later')) {
      setNextQuestion(question);
    }
    setSelectingQuestionLoading(false);
  };

  const cleanupPlaceholder = async (topicId) => {
    if (!user?.uid || !goal || !topicId) return;
    try {
      const placeholderDocRef = doc(db, 'users', user.uid, 'progress', goal, topicId, 'placeholder');
      await deleteDoc(placeholderDocRef);
    } catch (error) {
      console.warn('Error cleaning up placeholder:', error);
    }
  };

  const updateUserQuestion = async (topicId, questionId, { status, codes, notes }) => {
    if (!user?.uid || !goal || !topicId || !questionId || !status) {
      console.warn('Invalid input:', { user: !!user?.uid, goal, topicId, questionId, status });
      setError('Missing required fields');
      return;
    }

    try {
      await cleanupPlaceholder(topicId);

      const questionDocRef = doc(db, 'users', user.uid, 'progress', goal, topicId, questionId);
      const updatedProgress = { status, codes, notes };

      await setDoc(questionDocRef, updatedProgress, { merge: true });

      const updatedQuestions = questions.map(q =>
        q.id === questionId ? { ...q, ...updatedProgress } : q
      );

      setQuestions(updatedQuestions);

      const newProgress = {
        ...topicProgress,
        [questionId]: { ...(topicProgress[questionId] || {}), ...updatedProgress }
      };

      setTopicProgress(newProgress);
      setSelectedQuestion(prev => ({ ...prev, ...updatedProgress }));

      handleUserQuestion(updatedQuestions, newProgress, topicId);

      const allFinished = updatedQuestions.every(q =>
        newProgress[q.id]?.status === 'Completed' || newProgress[q.id]?.status === 'Review Later'
      );

      if (allFinished && !isTransitioning) {
        setIsTransitioning(true);
        const sortedTopics = [...topics].sort((a, b) => a.order - b.order);
        const currentIndex = sortedTopics.findIndex(t => t.id === topicId);
        const nextTopic = sortedTopics[currentIndex + 1];

        if (nextTopic) {
          const nextTopicId = nextTopic.id;
          await updateUserData({
            lastTopic: {
              ...userData.lastTopic,
              [goal]: nextTopicId
            }
          });

          setSelectedTopicId(nextTopicId);
          await fetchTopicDetails(nextTopicId);
        }
        setIsTransitioning(false);
      }
    } catch (error) {
      console.error(`Error updating question ${questionId} in topic ${topicId}:`, error);
      setError(error.message);
      setIsTransitioning(false);
    }
  };

  const removeQuestionStatus = async (topicId, questionId) => {
    if (!user?.uid || !goal || !topicId || !questionId) return;

    try {
      const questionDocRef = doc(db, 'users', user.uid, 'progress', goal, topicId, questionId);
      await updateDoc(questionDocRef, { status: deleteField() });

      // Update local state
      const updatedQuestions = questions.map(q =>
        q.id === questionId ? { ...q, status: undefined } : q
      );
      setQuestions(updatedQuestions);

      const updatedProgress = { ...topicProgress };
      if (updatedProgress[questionId]) {
        delete updatedProgress[questionId].status;
      }
      setTopicProgress(updatedProgress);

      if (selectedQuestion?.id === questionId) {
        setSelectedQuestion(prev => ({ ...prev, status: undefined }));
      }

      handleUserQuestion(updatedQuestions, updatedProgress, topicId);

      // ✅ Set lastTopic to the current topic in user doc
      await updateUserData({
        lastTopic: {
          ...userData.lastTopic,
          [goal]: topicId
        }
      });

    } catch (error) {
      console.error('Failed to remove question status:', error);
      setError(error.message);
    }
  };

  const handleUserQuestion = (questionList = questions, userProgress = topicProgress, topicIdOverride = selectedTopicId) => {
    const sortedQuestions = [...questionList].sort((a, b) => a.order - b.order);
    const nextQuestion = sortedQuestions.find(q => {
      if (q.topicId !== topicIdOverride) return false;
      const status = userProgress[q.id]?.status;
      return !status || status === 'Unsolved';
    }) || sortedQuestions.find(q => q.topicId === topicIdOverride);
    handleSelectQuestion(nextQuestion);
  };

  useEffect(() => {
    if (userData?.goal) {
      setGoal(userData.goal);
    }
  }, [userData]);

  useEffect(() => {
    const loadTopics = async () => {
      if (!userData || !goal || !user?.uid) {
        return;
      }

      const topicsData = await fetchTopicNames();

      const lastTopicForGoal = userData.lastTopic?.[goal];
      const validTopicId = topicsData.some(t => t.id === lastTopicForGoal)
        ? lastTopicForGoal
        : topicsData[0]?.id;

      setSelectedTopicId(validTopicId);
      await fetchTopicDetails(validTopicId);
    };

    loadTopics();
  }, [goal, userData, user?.uid]);

  useEffect(() => {
    if (!selectedTopicId) return;
    setTopicProgress({});
    fetchTopicDetails(selectedTopicId);
  }, [selectedTopicId]);

  const value = {
    topics,
    questions,
    selectedTopicId,
    setSelectedTopicId,
    topicProgress,
    selectedQuestion,
    nextQuestion,
    setSelectedQuestion,
    handleSelectQuestion,
    handleUserQuestion,
    loading,
    selectingQuestionLoading,
    error,
    goal,
    setGoal,
    updateUserData,
    fetchTopicNames,
    fetchTopicDetails,
    updateUserQuestion,
    removeQuestionStatus,
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
};