import { Link } from 'react-router-dom';

function UserDashboard() {
  return (
    <div className="p-4">
      <h2>User Dashboard</h2>
      <p>Browse and solve DSA questions organized by topic.</p>
      <Link to="/user/questions" className="btn btn-primary">View Questions</Link>
    </div>
  );
}

export default UserDashboard;