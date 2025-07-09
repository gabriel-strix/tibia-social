"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import firebaseApp from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import db from "../lib/firestore";

const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState<any>(null); // agora aceita campos extras
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(userRef);
        let extra = {};
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            createdAt: new Date(),
            following: [],
            isAdmin: false,
            banned: false,
          });
          extra = { isAdmin: false, banned: false };
        } else {
          extra = docSnap.data();
        }
        setUser({ ...firebaseUser, ...extra });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  function login() {
    return signInWithPopup(auth, provider);
  }

  function logout() {
    return signOut(auth);
  }

  return { user, loading, login, logout };
}
