import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function AdminQuestionForm({ question, categories, difficulties, statuses, onSubmit }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(
    question || {
      title: '',
      category: categories[1],
      difficulty: difficulties[1],
      description: '',
      solution: '',
      status: statuses[1],
      externalLink: ''
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, id: question ? question.id : undefined });
    navigate('/admin/questions');
  };

  return (
    <div className="card p-4 m-4">
      <h2>{question ? 'Edit Question' : 'Add New Question'}</h2>
      <div className="mb-3">
        <label className="form-label">Title</label>
        <input
          type="text"
          className="form-control"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Category</label>
        <select
          className="form-select"
          name="category"
          value={formData.category}
          onChange={handleChange}
        >
          {categories.slice(1).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Difficulty</label>
        <select
          className="form-select"
          name="difficulty"
          value={formData.difficulty}
          onChange={handleChange}
        >
          {difficulties.slice(1).map(diff => (
            <option key={diff} value={diff}>{diff}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Status</label>
        <select
          className="form-select"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          {statuses.slice(1).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea
          className="form-control"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="4"
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Solution</label>
        <textarea
          className="form-control"
          name="solution"
          value={formData.solution}
          onChange={handleChange}
          rows="4"
        />
      </div>
      <div className="mb-3">
        <label className="form-label">External Link (e.g., LeetCode)</label>
        <input
          type="url"
          className="form-control"
          name="externalLink"
          value={formData.externalLink}
          onChange={handleChange}
          placeholder="https://leetcode.com/problems/..."
        />
      </div>
      <div className="d-flex gap-2">
        <button className="btn btn-primary" onClick={handleSubmit}>
          {question ? 'Update' : 'Add'} Question
        </button>
        <Link to="/admin/questions" className="btn btn-secondary">Cancel</Link>
      </div>
    </div>
  );
}

export default AdminQuestionForm;