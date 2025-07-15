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

  const createUserIfNotExists = async (firebaseUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const newUserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "",
        phoneNumber: firebaseUser.phoneNumber || "",
        createdAt: new Date().toISOString(),
        goal: "learn",
      };
      await setDoc(userDocRef, newUserData);
      setUserData(newUserData);
    } else {
      setUserData(userDoc.data());
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await createUserIfNotExists(currentUser);
      } else {
        setUserData(null);
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


const setUpRecaptcha = (containerId, phoneNumber) => {
  return new Promise((resolve, reject) => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        containerId,
        {
          size: "invisible",
          callback: () => {},
          "expired-callback": () => {
            console.log("reCAPTCHA expired. Resetting...");
          },
        },
        auth
      );
    }

    const appVerifier = window.recaptchaVerifier;
    signInWithPhoneNumber(auth, `+91${phoneNumber}`, appVerifier)
      .then((confirmationResult) => resolve(confirmationResult))
      .catch((error) => reject(error));
  });
};


  const verifyOtp = async (otp, confirmationResult) => {
    if (!confirmationResult) {
      throw new Error("No confirmation result available. Please request a new OTP.");
    }
    const result = await confirmationResult.confirm(otp);
    setUser(result.user);
    await createUserIfNotExists(result.user);
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
    await createUserIfNotExists(result.user);
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