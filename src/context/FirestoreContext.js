import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, deleteField, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseContext';

const FirestoreContext = createContext();
export const useFirestore = () => useContext(FirestoreContext);

export const FirestoreProvider = ({ children }) => {
  const { user, userData } = useFirebase();

  const [loading, setLoading] = useState(true);
  const [selectingQuestionLoading, setSelectingQuestionLoading] = useState(true);
  const [goal, setGoal] = useState(userData?.goal || null);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [topicProgress, setTopicProgress] = useState({});
  const [topicQuestionCounts, setTopicQuestionCounts] = useState({});
  const [allTopicsProgress, setAllTopicsProgress] = useState({});
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [nextQuestion, setNextQuestion] = useState(null);
  const [error, setError] = useState(null);

  // Stable refs to avoid stale closures without adding to dep arrays
  const isTransitioningRef = useRef(false);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const pickNextQuestion = (questionList, userProgress, topicId) => {
    const sorted = [...questionList].sort((a, b) => a.order - b.order);
    return (
      sorted.find(q => {
        if (q.topicId !== topicId) return false;
        const status = userProgress[q.id]?.status;
        return !status || status === 'Unsolved';
      }) || sorted.find(q => q.topicId === topicId)
    );
  };

  const applySelectedQuestion = (question, userProgress) => {
    if (!question?.id) {
      setSelectedQuestion(null);
      setNextQuestion(null);
      setSelectingQuestionLoading(false);
      return;
    }
    const merged = { ...question, ...(userProgress?.[question.id] || {}) };
    setSelectedQuestion(merged);
    setNextQuestion(prev =>
      prev === null || !['Completed', 'Review Later'].includes(question.status)
        ? question
        : prev
    );
    setSelectingQuestionLoading(false);
  };

  // ─── Firestore reads ─────────────────────────────────────────────────────────

  const fetchProgress = async (topicId) => {
    if (!user?.uid || !goal || !topicId) return {};
    try {
      const ref = collection(db, 'users', user.uid, 'progress', goal, topicId);
      const snap = await getDocs(ref);
      return Object.fromEntries(
        snap.docs.filter(d => d.id !== 'placeholder').map(d => [d.id, d.data()])
      );
    } catch (err) {
      console.error('fetchProgress:', err);
      return {};
    }
  };

  const fetchTopicDetails = useCallback(async (topicId) => {
    if (!topicId || !goal) return;
    try {
      setSelectingQuestionLoading(true);
      setQuestions([]);
      setSelectedQuestion(null);
      setNextQuestion(null);

      const collectionName = goal === 'learn' ? 'learn' : 'practice';
      const snap = await getDoc(doc(db, collectionName, topicId));
      if (!snap.exists()) throw new Error(`Topic ${topicId} not found`);

      const progress = await fetchProgress(topicId);
      setTopicProgress(progress);
      setAllTopicsProgress(prev => ({ ...prev, [topicId]: progress }));

      const questionsData = (snap.data().questions || [])
        .map(q => ({ ...q, topicId, ...(progress[q.id] || {}) }))
        .sort((a, b) => a.order - b.order);

      setQuestions(questionsData);
      setTopicQuestionCounts(prev => ({ ...prev, [topicId]: questionsData.length }));

      if (questionsData.length === 0) {
        setSelectingQuestionLoading(false);
        return;
      }

      const next = pickNextQuestion(questionsData, progress, topicId);
      applySelectedQuestion(next, progress);
    } catch (err) {
      console.error('fetchTopicDetails:', err);
      setError(err.message);
      setSelectingQuestionLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, user?.uid]);

  // ─── Bootstrap: runs only when goal or user changes ──────────────────────────

  // Using a ref so the effect dep array stays [goal, user?.uid]
  const userDataRef = useRef(userData);
  userDataRef.current = userData;

  // Sync goal from userData
  useEffect(() => {
    if (userData?.goal) setGoal(userData.goal);
  }, [userData?.goal]);

  // Main load effect
  useEffect(() => {
    const load = async () => {
      if (!goal || !user?.uid) return;
      setLoading(true);
      try {
        const goalSnap = await getDoc(doc(db, 'topics', goal));
        if (!goalSnap.exists()) throw new Error(`Goal '${goal}' not found`);
        const topicsData = (goalSnap.data().topics || []).sort((a, b) => a.order - b.order);
        setTopics(topicsData);

        const [progressResults, countResults] = await Promise.all([
          Promise.all(topicsData.map(async t => {
            const p = await fetchProgress(t.id);
            return [t.id, p];
          })),
          Promise.all(topicsData.map(async t => {
            const s = await getDoc(doc(db, goal === 'learn' ? 'learn' : 'practice', t.id));
            return [t.id, (s.data()?.questions || []).length];
          }))
        ]);

        setAllTopicsProgress(Object.fromEntries(progressResults));
        setTopicQuestionCounts(Object.fromEntries(countResults));

        const lastTopic = userDataRef.current?.lastTopic?.[goal];
        const topicId = topicsData.some(t => t.id === lastTopic) ? lastTopic : topicsData[0]?.id;
        setSelectedTopicId(topicId);
        await fetchTopicDetails(topicId);
      } catch (err) {
        console.error('load:', err);
        setError(err.message);
      } finally {
        setLoading(false); // ✅ always runs now
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, user?.uid]); // ✅ stable primitives only

  // ─── Writes ──────────────────────────────────────────────────────────────────

  const updateUserData = async (newData) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), newData);
    } catch (err) {
      console.error('updateUserData:', err);
      setError(err.message);
    }
  };

  const updateUserQuestion = async (topicId, questionId, { status, codes, notes }) => {
    if (!user?.uid || !goal || !topicId || !questionId || !status) return;
    try {
      const ref = doc(db, 'users', user.uid, 'progress', goal, topicId, questionId);

      // Remove placeholder if it exists
      await deleteDoc(doc(db, 'users', user.uid, 'progress', goal, topicId, 'placeholder'))
        .catch(() => { });

      const updatedProgress = { status, codes, notes };
      await setDoc(ref, updatedProgress, { merge: true });

      const newProgress = {
        ...topicProgress,
        [questionId]: { ...(topicProgress[questionId] || {}), ...updatedProgress }
      };
      const updatedQuestions = questions.map(q =>
        q.id === questionId ? { ...q, ...updatedProgress } : q
      );

      setTopicProgress(newProgress);
      setAllTopicsProgress(prev => ({ ...prev, [topicId]: newProgress }));
      setQuestions(updatedQuestions);
      setSelectedQuestion(prev => ({ ...prev, ...updatedProgress }));

      const next = pickNextQuestion(updatedQuestions, newProgress, topicId);
      applySelectedQuestion(next, newProgress);

      // Auto-advance to next topic when all done
      const allDone = updatedQuestions.every(q =>
        ['Completed', 'Review Later'].includes(newProgress[q.id]?.status)
      );

      if (allDone && !isTransitioningRef.current) {
        isTransitioningRef.current = true;
        const sorted = [...topics].sort((a, b) => a.order - b.order);
        const nextTopic = sorted[sorted.findIndex(t => t.id === topicId) + 1];
        if (nextTopic) {
          await updateUserData({ lastTopic: { ...userDataRef.current?.lastTopic, [goal]: nextTopic.id } });
          setSelectedTopicId(nextTopic.id);
          await fetchTopicDetails(nextTopic.id);
        }
        isTransitioningRef.current = false;
      }
    } catch (err) {
      console.error('updateUserQuestion:', err);
      setError(err.message);
      isTransitioningRef.current = false;
    }
  };

  const removeQuestionStatus = async (topicId, questionId) => {
    if (!user?.uid || !goal || !topicId || !questionId) return;
    try {
      await updateDoc(
        doc(db, 'users', user.uid, 'progress', goal, topicId, questionId),
        { status: deleteField() }
      );

      const updatedQuestions = questions.map(q =>
        q.id === questionId ? { ...q, status: undefined } : q
      );
      const updatedProgress = { ...topicProgress };
      if (updatedProgress[questionId]) delete updatedProgress[questionId].status;

      setQuestions(updatedQuestions);
      setTopicProgress(updatedProgress);
      setAllTopicsProgress(prev => ({ ...prev, [topicId]: updatedProgress }));
      if (selectedQuestion?.id === questionId) setSelectedQuestion(prev => ({ ...prev, status: undefined }));

      const next = pickNextQuestion(updatedQuestions, updatedProgress, topicId);
      applySelectedQuestion(next, updatedProgress);

      await updateUserData({ lastTopic: { ...userDataRef.current?.lastTopic, [goal]: topicId } });
    } catch (err) {
      console.error('removeQuestionStatus:', err);
      setError(err.message);
    }
  };

  // ─── Context value ────────────────────────────────────────────────────────────

  const value = {
    topics, questions, selectedTopicId, setSelectedTopicId,
    topicProgress, topicQuestionCounts, allTopicsProgress,
    selectedQuestion, nextQuestion, setSelectedQuestion,
    loading, selectingQuestionLoading, error,
    goal, setGoal,
    updateUserData, fetchTopicDetails,
    updateUserQuestion, removeQuestionStatus,
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
};