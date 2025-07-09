// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAyZtPq0U8n9LvvGwq8uBIgMJhZW0ymQCs",
  authDomain: "tibiasocial-d0fc7.firebaseapp.com",
  projectId: "tibiasocial-d0fc7",
  storageBucket: "tibiasocial-d0fc7.firebasestorage.app",
  messagingSenderId: "956560112736",
  appId: "1:956560112736:web:45606aec8067c0f3449705",
  measurementId: "G-3RVPG9HMZL"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export default app;


