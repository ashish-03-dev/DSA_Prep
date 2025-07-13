import { Link } from 'react-router-dom';

function Sidebar({ role, setRole, categories, questions, selectedQuestion, setSelectedQuestion }) {
  const queue = questions.filter(q => q.id !== selectedQuestion?.id);

  return (
    <div className="bg-light vh-100 p-3" style={{ position: 'sticky', top: 0 }}>
      <h4 className="mb-3">DSA Organizer</h4>
      <div className="mb-3">
        <label className="form-label">Role</label>
        <select
          className="form-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <ul className="nav flex-column">
        {role === 'admin' ? (
          <>
            <li className="nav-item">
              <Link className="nav-link" to="/admin">Dashboard</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/admin/questions">Question List</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/admin/questions/add">Add Question</Link>
            </li>
          </>
        ) : (
          <>
            <li className="nav-item">
              <Link className="nav-link" to="/user">Dashboard</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/user/questions">Question List</Link>
            </li>
          </>
        )}
      </ul>
      {role === 'user' && (
        <>
          <hr />
          <h5>Current Question</h5>
          {selectedQuestion ? (
            <div className="mb-3">
              <h6>{selectedQuestion.title}</h6>
              <p><small>{selectedQuestion.category} | {selectedQuestion.difficulty}</small></p>
              <Link
                to={`/user/questions/solve/${selectedQuestion.id}`}
                className="btn btn-sm btn-primary"
              >
                Solve Now
              </Link>
            </div>
          ) : (
            <p>No question selected</p>
          )}
          <hr />
          <h5>Question Queue</h5>
          <ul className="list-group">
            {queue.map(question => (
              <li
                key={question.id}
                className="list-group-item list-group-item-action"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedQuestion(question);
                }}
              >
                <Link to={`/user/questions/solve/${question.id}`}>
                  {question.title} ({question.difficulty})
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default Sidebar;