import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminDashboard from './Admin/AdminDashboard';
import AdminQuestionList from './Admin/AdminQuestionList';
import AdminQuestionForm from './Admin/AdminQuestionForm';
import AdminQuestionView from './Admin/AdminQuestionView';
import UserDashboard from './User/UserDashboard';
import UserQuestionList from './User/UserQuestionList';
import UserQuestionSolver from './User/UserQuestionSolver';

function App() {
  const [questions, setQuestions] = useState([
    {
      id: 1,
      title: "Reverse a Linked List",
      category: "Linked List",
      difficulty: "Medium",
      description: "Write a function to reverse a singly linked list.",
      solution: "Iterative solution: Use three pointers (prev, curr, next).",
      status: "Unsolved",
      externalLink: "https://leetcode.com/problems/reverse-linked-list/"
    },
    {
      id: 2,
      title: "Binary Search",
      category: "Searching",
      difficulty: "Easy",
      description: "Implement binary search on a sorted array.",
      solution: "Use divide and conquer with mid-point calculation.",
      status: "Solved",
      externalLink: "https://leetcode.com/problems/binary-search/"
    },
    {
      id: 3,
      title: "Two Sum",
      category: "Array",
      difficulty: "Easy",
      description: "Given an array of integers, find two numbers that sum to a target.",
      solution: "Use a hash map to store complements.",
      status: "Unsolved",
      externalLink: "https://leetcode.com/problems/two-sum/"
    }
  ]);

  const [role, setRole] = useState('user'); // 'admin' or 'user'
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const categories = ['All', 'Array', 'Linked List', 'Tree', 'Graph', 'Searching', 'Sorting', 'Dynamic Programming'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];
  const statuses = ['All', 'Solved', 'Unsolved', 'Attempted'];

  const addQuestion = (newQuestion) => {
    setQuestions([...questions, { ...newQuestion, id: questions.length + 1 }]);
  };

  const updateQuestion = (updatedQuestion) => {
    setQuestions(questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestionStatus = (id, newStatus) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, status: newStatus } : q));
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-3">
          <Sidebar
            role={role}
            setRole={setRole}
            categories={categories}
            questions={questions}
            selectedQuestion={selectedQuestion}
            setSelectedQuestion={setSelectedQuestion}
          />
        </div>
        <div className="col-md-9">
          <Routes>
            <Route path="/" element={<Navigate to={role === 'admin' ? '/admin' : '/user'} />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/questions" element={
              <AdminQuestionList
                questions={questions}
                categories={categories}
                difficulties={difficulties}
                statuses={statuses}
                setSelectedQuestion={setSelectedQuestion}
                deleteQuestion={deleteQuestion}
              />
            } />
            <Route path="/admin/questions/add" element={
              <AdminQuestionForm
                categories={categories}
                difficulties={difficulties}
                statuses={statuses}
                onSubmit={addQuestion}
              />
            } />
            <Route path="/admin/questions/edit/:id" element={
              <AdminQuestionForm
                question={selectedQuestion}
                categories={categories}
                difficulties={difficulties}
                statuses={statuses}
                onSubmit={updateQuestion}
              />
            } />
            <Route path="/admin/questions/view/:id" element={
              <AdminQuestionView
                question={selectedQuestion}
                setSelectedQuestion={setSelectedQuestion}
              />
            } />
            <Route path="/user" element={<UserDashboard />} />
            <Route path="/user/questions" element={
              <UserQuestionList
                questions={questions}
                categories={categories}
                difficulties={difficulties}
                statuses={statuses}
                setSelectedQuestion={setSelectedQuestion}
              />
            } />
            <Route path="/user/questions/solve/:id" element={
              <UserQuestionSolver
                question={selectedQuestion}
                updateQuestionStatus={updateQuestionStatus}
              />
            } />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;