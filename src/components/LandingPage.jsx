import React from "react";
import { useNavigate } from "react-router-dom";
import { useFirebase } from "../context/FirebaseContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { loading, user } = useFirebase();

  const handleStartPrep = () => {
    if (user) {
      navigate("/user");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
      <div className="text-center mb-4">
        <h1 className="display-4 fw-bold text-dark">DSA Organizer</h1>
        <p className="lead text-muted">
          Master Data Structures & Algorithms with personalized tracking and progress mapping
        </p>
      </div>

      {loading ? (
        <p className="fs-5 text-secondary">Loading...</p>
      ) : (
        <button
          className="btn btn-primary btn-lg"
          onClick={handleStartPrep}
        >
          Start Prep
        </button>
      )}

    </div>
  );
}
