// migrateTopicsToArray.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, orderBy, query } from 'firebase/firestore';

// ✅ Replace with your own Firebase config
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

// List of goals to process (e.g. 'learn' and 'practice')
const goals = ['learn', 'practice'];

const migrateTopics = async () => {
    for (const goal of goals) {
        try {
            const topicsRef = collection(db, 'topics', goal, 'topics');
            const q = query(topicsRef, orderBy('order'));
            const snapshot = await getDocs(q);

            const topicsArray = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                order: doc.data().order,
            }));

            const goalDocRef = doc(db, 'topics', goal);
            await setDoc(goalDocRef, {
                topics: topicsArray,
            }, { merge: true });

            console.log(`✅ Topics array saved for goal: ${goal}`);
        } catch (err) {
            console.error(`❌ Failed to migrate for goal ${goal}:`, err);
        }
    }
};

migrateTopics();
