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
          // Pede username ao criar novo usuário
          let username = '';
          while (!username || !/^[a-zA-Z0-9.,-]+$/.test(username)) {
            username = window.prompt('Escolha um nome de usuário único (apenas letras, números, ponto, vírgula e traço):') || '';
            if (!/^[a-zA-Z0-9.,-]+$/.test(username)) {
              alert('Nome de usuário inválido.');
            }
          }
          // Checa unicidade
          const { getDocs, collection, query, where } = await import('firebase/firestore');
          let isUnique = false;
          while (!isUnique) {
            const q = query(collection(db, 'users'), where('username', '==', username));
            const snap = await getDocs(q);
            if (snap.empty) {
              isUnique = true;
            } else {
              username = window.prompt('Nome de usuário já existe. Escolha outro:') || '';
            }
          }
          await setDoc(userRef, {
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            createdAt: new Date(),
            following: [],
            isAdmin: false,
            banned: false,
            username,
          });
          extra = { isAdmin: false, banned: false, username };
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
