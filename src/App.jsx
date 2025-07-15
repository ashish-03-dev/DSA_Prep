import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FirebaseProvider } from "./context/FirebaseContext";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import UserQuestionSolver from "./components/User/UserQuestionSolver";
import UserLayout from "./components/User/UserLayout";
import { FirestoreProvider } from "./context/FirestoreContext";
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/user" element={<ProtectedRoute><UserLayout /></ProtectedRoute>} >
        <Route index element={<UserQuestionSolver />} />
      </Route>
      <Route path="*" element={<Navigate to='/user' />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FirebaseProvider>
        <FirestoreProvider>
          <AppRoutes />
        </FirestoreProvider>
      </FirebaseProvider>
    </BrowserRouter>
  );
}