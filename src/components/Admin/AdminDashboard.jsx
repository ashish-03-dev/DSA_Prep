import { Link } from 'react-router-dom';

function AdminDashboard() {
  return (
    <div className="p-4">
      <h2>Admin Dashboard</h2>
      <p>Welcome to the admin panel. Manage DSA questions from here.</p>
      <Link to="/admin/questions" className="btn btn-primary">View Questions</Link>
      <Link to="/admin/questions/add" className="btn btn-success ms-2">Add New Question</Link>
    </div>
  );
}

export default AdminDashboard;