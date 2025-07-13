import { useState } from 'react';
import { Link } from 'react-router-dom';

function UserQuestionSolver({ question, updateQuestionStatus }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = () => {
    setResult('Code submitted successfully! Status: Passed');
    updateQuestionStatus(question.id, 'Solved');
  };

  return (
    <div className="card p-4 m-4">
      <h2>{question.title}</h2>
      <p><strong>Category:</strong> {question.category}</p>
      <p><strong>Difficulty:</strong> {question.difficulty}</p>
      <p><strong>Status:</strong> {question.status}</p>
      <p><strong>Description:</strong></p>
      <p>{question.description}</p>
      <p><strong>External Link:</strong> <a href={question.externalLink} target="_blank" rel="noopener noreferrer">{question.externalLink}</a></p>
      <div className="mb-3">
        <label className="form-label">Your Solution</label>
        <textarea
          className="form-control"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows="10"
          placeholder="Write your code here..."
        />
      </div>
      <div className="d-flex gap-2 mb-3">
        <button className="btn btn-primary" onClick={handleSubmit}>
          Submit Code
        </button>
        <Link to="/user/questions" className="btn btn-secondary">
          Back to List
        </Link>
      </div>
      {result && (
        <div className="alert alert-success">
          {result}
        </div>
      )}
    </div>
  );
}

export default UserQuestionSolver;