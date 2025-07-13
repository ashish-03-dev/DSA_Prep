import { Link } from 'react-router-dom';

function AdminQuestionView({ question, setSelectedQuestion }) {
  return (
    <div className="card p-4 m-4">
      <h2>{question.title}</h2>
      <p><strong>Category:</strong> {question.category}</p>
      <p><strong>Difficulty:</strong> {question.difficulty}</p>
      <p><strong>Status:</strong> {question.status}</p>
      <p><strong>Description:</strong></p>
      <p>{question.description}</p>
      <p><strong>Solution:</strong></p>
      <p>{question.solution}</p>
      <p><strong>External Link:</strong> <a href={question.externalLink} target="_blank" rel="noopener noreferrer">{question.externalLink}</a></p>
      <div className="d-flex gap-2">
        <Link
          to={`/admin/questions/edit/${question.id}`}
          className="btn btn-warning"
        >
          Edit
        </Link>
        <Link
          to="/admin/questions"
          className="btn btn-secondary"
          onClick={() => setSelectedQuestion(null)}
        >
          Back
        </Link>
      </div>
    </div>
  );
}

export default AdminQuestionView;