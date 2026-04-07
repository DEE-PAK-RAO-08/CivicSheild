import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBIrKl85_qyu0-RajwqbrvETB6l3DGZU2w",
  authDomain: "civicsheild-cd13a.firebaseapp.com",
  projectId: "civicsheild-cd13a",
  storageBucket: "civicsheild-cd13a.firebasestorage.app",
  messagingSenderId: "484653171694",
  appId: "1:484653171694:web:6dd6884a8ef97ab56584ff",
  measurementId: "G-KNJ7N41Z29"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
