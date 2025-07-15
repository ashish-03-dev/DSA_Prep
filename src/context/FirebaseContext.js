import { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { app } from "../firebase";

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const FirebaseContext = createContext();

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          const newUserData = {
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: currentUser.displayName || "",
            phoneNumber: currentUser.phoneNumber || "",
            createdAt: new Date().toISOString(),
            goal: 'learn',
          };
          await setDoc(userDocRef, newUserData);
          setUserData(newUserData);
        } else {
          setUserData(userDoc.data());
        }
      } else {
        setUserData(null);
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const setUpRecaptcha = async (containerId, phoneNumber) => {
    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => { },
    });
    const phone = `+91${phoneNumber}`;
    const confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    return confirmationResult;
  };

  const verifyOtp = async (otp, confirmationResult) => {
    if (!confirmationResult) {
      throw new Error("No confirmation result available. Please request a new OTP.");
    }
    const result = await confirmationResult.confirm(otp);
    setUser(result.user);

    const userDocRef = doc(db, "users", result.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      setUserData(userDoc.data());
    }
    return result;
  };

  const googleLogin = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    setUser(result.user);

    const userDocRef = doc(db, "users", result.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      setUserData(userDoc.data());
    }
    return result;
  };

  return (
    <FirebaseContext.Provider value={{ user, db, userData, setUserData, loading, setUpRecaptcha, verifyOtp, googleLogin }}>
      {children}
    </FirebaseContext.Provider>
  );
}