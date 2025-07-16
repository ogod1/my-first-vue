import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDG_DnwAXSWk295Ps6geazAVqvlzISnKCc",
    authDomain: "cs110-project-e1e44.firebaseapp.com",
    projectId: "cs110-project-e1e44",
    storageBucket: "cs110-project-e1e44.firebasestorage.app",
    messagingSenderId: "301083761617",
    appId: "1:301083761617:web:d9d932a273210713a41ef0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
