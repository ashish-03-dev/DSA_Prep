import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdUt_cGkY5n8CORddzAABAlbPvUmeRSOs",
  authDomain: "dsa-prep-bad14.firebaseapp.com",
  projectId: "dsa-prep-bad14",
  storageBucket: "dsa-prep-bad14.firebasestorage.app",
  messagingSenderId: "117350188690",
  appId: "1:117350188690:web:e74f7c8f62232326c8884b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
