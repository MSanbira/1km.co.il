import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';
import 'firebase/auth';
import 'firebase/database';

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

firebase.initializeApp(config);

export const firestore = firebase.firestore();
export const realtimeDB = firebase.database();
export const storage = firebase.app().storage(process.env.REACT_APP_FIREBASE_CUSTOM_STORAGE).ref();
export const auth = firebase.auth();

// if (process.env.NODE_ENV === 'development') {
//   firestore.settings({
//     host: 'localhost:6001',
//     ssl: false,
//   });
// }

export const provider = new firebase.auth.GoogleAuthProvider();
export const signInWithGoogle = () => auth.signInWithPopup(provider);
export const signOut = () => auth.signOut();

export default firebase;
