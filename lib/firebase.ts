import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBRgyUH4EzXzNbb-c1aBs8D1TonSFNHO0U',
  authDomain: 'bloc-the-app.firebaseapp.com',
  projectId: 'bloc-the-app',
  storageBucket: 'bloc-the-app.firebasestorage.app',
  messagingSenderId: '907292928023',
  appId: '1:907292928023:web:bee7b9fecb1494b8de5452',
  measurementId: 'G-06DEZTQ0H2',
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
