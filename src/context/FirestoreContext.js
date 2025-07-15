import { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, addDoc, setDoc, updateDoc, deleteDoc, doc, query, orderBy, deleteField } from 'firebase/firestore';
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
      const collectionName = goal === 'learn' ? 'learn' : 'practice';
      const q = query(
        collection(db, collectionName, topicId, 'questions'),
        orderBy('order', 'asc')
      );

      const questionsSnap = await getDocs(q);
      const progress = await fetchUserProgressByTopic(topicId); // fresh progress

      const questionsData = questionsSnap.docs.map(doc => {
        const question = { id: doc.id, topicId, ...doc.data() };
        return {
          ...question,
          ...(progress?.[doc.id] || {})
        };
      });

      setQuestions(questionsData);

      if (questionsData.length === 0) {
        setSelectingQuestionLoading(false);
        return;
      }

      handleUserQuestion(questionsData, progress); // <- fixed
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError(error.message);
      return [];
    }
  };

  const fetchUserProgressByTopic = async (topicId) => {
    if (!user?.uid || !goal || !topicId) {
      console.warn('Invalid input:', { user: !!user?.uid, goal, topicId });
      setTopicProgress({});
      return {};
    }

    try {
      const questionsCollectionRef = collection(
        db,
        'users',
        user.uid,
        'progress',
        goal,
        topicId // Subcollection (e.g., Arrays)
      );

      const progressSnap = await getDocs(questionsCollectionRef);

      const progressData = Object.fromEntries(
        progressSnap.docs.map((doc) => [doc.id, doc.data()])
      );

      setTopicProgress(progressData);
      return progressData;
    } catch (error) {
      console.error(`Error fetching progress for topic ${topicId}:`, {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      setTopicProgress({});
      return {};
    }
  };

  const handleSelectQuestion = (question) => {
    if (!question?.id) return;

    const progress = topicProgress?.[question.id] || {};

    const enrichedQuestion = {
      ...question,
      ...progress, // includes saved notes, codes, status
    };

    setSelectedQuestion(enrichedQuestion);
    setSelectingQuestionLoading(false);
  };

  const addQuestion = async (topicId, question) => {
    setLoading(true);
    try {
      const collectionName = goal === 'learn' ? 'learn' : 'practice';
      const docRef = await addDoc(collection(db, collectionName, topicId, 'questions'), question);
      const newQuestion = { id: docRef.id, topicId, ...question };
      setQuestions(prev => [...prev, newQuestion]);
      return newQuestion;
    } catch (error) {
      console.error('Error adding question:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserQuestion = async (topicId, questionId, { status, codes, notes }) => {
    if (!user?.uid || !goal || !topicId || !questionId || !status) {
      console.warn('Invalid input:', { user: !!user?.uid, goal, topicId, questionId, status });
      setError('Missing required fields');
      return;
    }

    try {
      const questionDocRef = doc(
        db,
        'users',
        user.uid,
        'progress',
        goal,
        topicId,
        questionId
      );

      const updatedProgress = { status, codes, notes };

      // Firestore update
      await setDoc(questionDocRef, updatedProgress, { merge: true });

      const updatedQuestions = questions.map(q =>
        q.id === questionId ? { ...q, ...updatedProgress } : q
      );
      setQuestions(updatedQuestions);

      // Update topicProgress
      const newProgress = {
        ...topicProgress,
        [questionId]: {
          ...(topicProgress[questionId] || {}),
          ...updatedProgress,
        }
      };
      setTopicProgress(newProgress);

      // If selected question matches, update its state too
      if (selectedQuestion?.id === questionId) {
        setSelectedQuestion(prev => ({
          ...prev,
          ...updatedProgress
        }));
      }

      setTimeout(() => {
        handleUserQuestion(updatedQuestions, newProgress);
      }, 500);

      // Check if it's the last question of topic and all are solved
      const allSolved = updatedQuestions.every(q =>
        newProgress[q.id]?.status === 'Solved'
      );

      if (allSolved) {
        const currentTopic = topics.find(t => t.id === topicId);
        if (currentTopic) {
          const sortedTopics = [...topics].sort((a, b) => a.order - b.order);
          const currentIndex = sortedTopics.findIndex(t => t.id === topicId);
          const nextTopic = sortedTopics[currentIndex + 1];

          if (nextTopic) {
            const nextTopicId = nextTopic.id;

            // Update user's progress doc to include next topic (just initialize)
            const userDocRef = doc(db, 'users', user.uid);
            const userProgressUpdate = {
              [`progress.${goal}.${nextTopicId}`]: {} // Add empty progress record
            };

            await updateDoc(userDocRef, userProgressUpdate);

            // Optionally: auto-select next topic
            setSelectedTopicId(nextTopicId);
          }
        }
      }

    } catch (error) {
      console.error(`Error updating question ${questionId} in topic ${topicId}:`, {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      setError(error.message);
    }
  };

 const removeQuestionStatus = async (topicId, questionId) => {
  if (!user?.uid || !goal || !topicId || !questionId) return;

  try {
    const questionDocRef = doc(
      db,
      'users',
      user.uid,
      'progress',
      goal,
      topicId,
      questionId
    );

    await updateDoc(questionDocRef, {
      status: deleteField()
    });

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
      setSelectedQuestion(prev => ({
        ...prev,
        status: undefined,
      }));
    }

    setTimeout(() => {
      handleUserQuestion(updatedQuestions, updatedProgress);
    }, 300);

  } catch (error) {
    console.error('Failed to remove question status:', error);
    setError(error.message);
  }
};


  const deleteQuestion = async (topicId, id) => {
    setLoading(true);
    try {
      const collectionName = goal === 'learn' ? 'learn' : 'practice';
      await deleteDoc(doc(db, collectionName, topicId, 'questions', id));
      setQuestions(prev => prev.filter(q => q.id !== id));
      if (selectedQuestion?.id === id) {
        setSelectedQuestion(null);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleUserQuestion = (questionList = questions, userProgress = topicProgress) => {
    const sortedQuestions = [...questionList].sort((a, b) => a.order - b.order);

    const nextQuestion = sortedQuestions.find((q) => {
      const status = userProgress[q.id]?.status;
      return !status || status === 'Unsolved';
    }) || sortedQuestions[0];

    handleSelectQuestion(nextQuestion || null);
  };

  // First set the goal when userData changes
  useEffect(() => {
    if (userData?.goal) {
      setGoal(userData.goal);
    }
  }, [userData]);

  // Then, when goal is set, fetch topics
  useEffect(() => {
    const loadTopics = async () => {
      if (!userData || !goal) return;
      const topicsData = await fetchTopics();

      const userProgressTopics = userData.progress?.[goal] || {};

      let defaultTopicId = null;

      const validUserTopics = Object.keys(userProgressTopics)
        .map(topicId => {
          const topicMeta = topicsData.find(t => t.id === topicId);
          if (!topicMeta) return null;
          return {
            id: topicId,
            order: topicMeta.order ?? 0,
          };
        })
        .filter(Boolean);

      if (validUserTopics.length > 0) {
        defaultTopicId = validUserTopics.sort((a, b) => b.order - a.order)[0]?.id;
      } else if (topicsData.length > 0) {
        defaultTopicId = topicsData[0]?.id;
      }

      if (defaultTopicId) {
        setSelectedTopicId(defaultTopicId);
      }
    };

    loadTopics();
  }, [goal, userData]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!selectedTopicId || !userData) return;
      setTopicProgress({});
      await fetchQuestions(selectedTopicId);
    };

    loadQuestions();
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
    addQuestion,
    updateUserQuestion,
    deleteQuestion,
    updateUserQuestion,
    removeQuestionStatus,
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
};