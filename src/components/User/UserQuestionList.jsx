import { Link } from 'react-router-dom';
import React from 'react';

function UserQuestionList({ questions, categories, difficulties, statuses, setSelectedQuestion }) {
  const [filterCategory, setFilterCategory] = React.useState('');
  const [filterDifficulty, setFilterDifficulty] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');

  const filteredQuestions = questions.filter(q => 
    (filterCategory === '' || filterCategory === 'All' || q.category === filterCategory) &&
    (filterDifficulty === '' || filterDifficulty === 'All' || q.difficulty === filterDifficulty) &&
    (filterStatus === '' || filterStatus === 'All' || q.status === filterStatus)
  );

  const groupedQuestions = filteredQuestions.reduce((acc, question) => {
    acc[question.category] = acc[question.category] || [];
    acc[question.category].push(question);
    return acc;
  }, {});

  return (
    <div className="p-4">
      <h2>Question List</h2>
      <div className="d-flex gap-3 mb-4">
        <div>
          <label className="form-label">Category</label>
          <select
            className="form-select"
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Difficulty</label>
          <select
            className="form-select"
            onChange={(e) => setFilterDifficulty(e.target.value)}
          >
            {difficulties.map(diff => (
              <option key={diff} value={diff}>{diff}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Status</label>
          <select
            className="form-select"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>
      {Object.keys(groupedQuestions).map(category => (
        <div key={category} className="mb-4">
          <h3>{category}</h3>
          <div className="row">
            {groupedQuestions[category].map(question => (
              <div key={question.id} className="col-md-4 mb-3">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">{question.title}</h5>
                    <p className="card-text">
                      <strong>Difficulty:</strong> {question.difficulty}<br />
                      <strong>Status:</strong> {question.status}<br />
                      <a href={question.externalLink} target="_blank" rel="noopener noreferrer">LeetCode Link</a>
                    </p>
                    <Link
                      to={`/user/questions/solve/${question.id}`}
                      className="btn btn-sm btn-primary"
                      onClick={() => setSelectedQuestion(question)}
                    >
                      Solve
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default UserQuestionList;