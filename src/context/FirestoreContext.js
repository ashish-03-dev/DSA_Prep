import { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, query, orderBy, deleteField } from 'firebase/firestore';
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
  const [error, setError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const updateUserData = async (newData) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, newData);
      setUserData(prev => ({ ...prev, ...newData }));
    } catch (error) {
      console.error('Error updating user data:', error);
      setError(error.message);
    }
  };

  const fetchTopics = async () => {
    try {
      const collectionName = goal === 'learn' ? 'learn' : 'practice';
      const topicsSnap = await getDocs(collection(db, collectionName));
      const topicsData = topicsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.order - b.order);

      setTopics(topicsData);
      return topicsData;
    } catch (error) {
      console.error('Error fetching topics:', error);
      setError(error.message);
      setTopics([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (topicId) => {
    try {
      setSelectingQuestionLoading(true);
      setQuestions([]);
      setSelectedQuestion(null);
      const collectionName = goal === 'learn' ? 'learn' : 'practice';
      const q = query(
        collection(db, collectionName, topicId, 'questions'),
        orderBy('order', 'asc')
      );

      const questionsSnap = await getDocs(q);
      const progress = await fetchUserProgressByTopic(topicId);

      const questionsData = questionsSnap.docs.map(doc => ({
        id: doc.id,
        topicId,
        ...doc.data(),
        ...(progress?.[doc.id] || {})
      }));

      setQuestions(questionsData);
      if (questionsData.length === 0) {
        setSelectingQuestionLoading(false);
        return;
      }
      handleUserQuestion(questionsData, progress, topicId);

    } catch (error) {
      console.error('Error fetching questions:', error);
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
      setSelectingQuestionLoading(false);
      return;
    }

    const progress = topicProgress?.[question.id] || {};
    setSelectedQuestion({ ...question, ...progress });
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

      if (selectedQuestion?.id === questionId) {
        setSelectedQuestion(prev => ({ ...prev, ...updatedProgress }));
      }

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
          const nextTopicDocRef = doc(db, 'users', user.uid, 'progress', goal, nextTopicId, 'placeholder');
          await setDoc(nextTopicDocRef, { initialized: true });

          await updateUserData({
            lastTopic: {
              ...userData.lastTopic,
              [goal]: nextTopicId
            }
          });

          setSelectedTopicId(nextTopicId);
          setQuestions([]);
          setSelectedQuestion(null);
          await fetchQuestions(nextTopicId);
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

      const topicsData = await fetchTopics();
      if (topicsData.length === 0) {
        console.warn('No topics available for goal:', goal);
        setError('No topics available');
        return;
      }

      const lastTopicForGoal = userData.lastTopic?.[goal];

      if (lastTopicForGoal && topicsData.some(t => t.id === lastTopicForGoal)) {
        if (lastTopicForGoal !== selectedTopicId) {
          setSelectedTopicId(lastTopicForGoal);
          setQuestions([]);
          setSelectedQuestion(null);
          await fetchQuestions(lastTopicForGoal);
        }
        return;
      }

      if (selectedTopicId && topicsData.some(t => t.id === selectedTopicId)) {
        console.log(`Topic already selected: ${selectedTopicId}`);
        return;
      }

      let defaultTopicId = null;
      const userProgressTopics = userData.progress?.[goal] || {};

      const validUserTopics = Object.keys(userProgressTopics)
        .map(topicId => {
          const topicMeta = topicsData.find(t => t.id === topicId);
          return topicMeta ? { id: topicId, order: topicMeta.order ?? 0 } : null;
        })
        .filter(Boolean);

      if (validUserTopics.length > 0) {
        defaultTopicId = validUserTopics.sort((a, b) => a.order - b.order).pop().id;
      } else {
        defaultTopicId = topicsData[0]?.id;
        if (defaultTopicId) {
          const firstTopicDocRef = doc(db, 'users', user.uid, 'progress', goal, defaultTopicId, 'placeholder');
          await setDoc(firstTopicDocRef, { initialized: true });
          await updateUserData({
            lastTopic: {
              ...userData.lastTopic,
              [goal]: defaultTopicId
            }
          });
        }
      }

      if (defaultTopicId && defaultTopicId !== selectedTopicId) {
        setSelectedTopicId(defaultTopicId);
        setQuestions([]);
        setSelectedQuestion(null);
        await fetchQuestions(defaultTopicId);
      } else if (!defaultTopicId) {
        setError('Unable to select a default topic');
      }
    };

    loadTopics();
  }, [goal, userData, user?.uid]);

  useEffect(() => {
    if (!selectedTopicId) return;
    setTopicProgress({});
    fetchQuestions(selectedTopicId);
  }, [selectedTopicId]);

  const value = {
    topics,
    questions,
    selectedTopicId,
    setSelectedTopicId,
    topicProgress,
    selectedQuestion,
    setSelectedQuestion,
    handleSelectQuestion,
    handleUserQuestion,
    loading,
    selectingQuestionLoading,
    error,
    goal,
    updateUserData,
    fetchTopics,
    fetchQuestions,
    updateUserQuestion,
    removeQuestionStatus,
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
};