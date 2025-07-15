import { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
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

  const googleLogin = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    setUser(result.user);
    await createUserIfNotExists(result.user); // this sets userData internally
    return result;
  };

  return (
    <FirebaseContext.Provider value={{ user, db, userData, setUserData, loading, googleLogin }}>
      {children}
    </FirebaseContext.Provider>
  );
}