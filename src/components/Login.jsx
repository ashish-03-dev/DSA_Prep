import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFirebase } from "../context/FirebaseContext";

export default function Login() {
    const navigate = useNavigate();
    const { googleLogin } = useFirebase();

    const handleGoogleLogin = async () => {
        try {
            await googleLogin();
            navigate("/user");
        } catch (err) {
            if (err.code !== "auth/popup-closed-by-user") {
                console.error("Google login failed:", err.message);
            }
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
            <div className="card shadow-lg p-4" style={{ maxWidth: "400px", width: "100%" }}>
                <div className="text-center mb-4">
                    <Link to="/">
                        <img
                            src="/logo192.png"
                            alt="DSA Organizer logo"
                            style={{
                                width: "60px",
                                height: "60px",
                                marginRight: "10px",
                                borderRadius: "50%",
                                objectFit: "cover",
                            }}
                        />
                    </Link>
                    <h4 className="fw-bold mt-3">DSA Organizer</h4>
                    <p className="text-muted">Sign in to track your DSA progress</p>
                </div>

                <button onClick={handleGoogleLogin} className="btn border w-100">
                    <img
                        src="https://developers.google.com/identity/images/g-logo.png"
                        alt="Google"
                        style={{ width: "20px", marginRight: "10px" }}
                    />
                    Continue with Google
                </button>
            </div>
        </div>
    );
}
