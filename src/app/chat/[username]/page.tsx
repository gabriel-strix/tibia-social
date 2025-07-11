"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import Spinner from "@/components/Spinner";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import db from "@/lib/firestore";
import RequireAuth from "@/components/RequireAuth";

export default function ChatWithUsernamePage() {
  return (
    <RequireAuth>
      <ChatWithUsernameContent />
    </RequireAuth>
  );
}

function ChatWithUsernameContent() {
  const params = useParams<{ username?: string }>();
  const username = params?.username || "";
  const [userData, setUserData] = useState<{ uid: string; name: string; photoURL: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!username) return;
    async function fetchUser() {
      // Busca o usuário pelo username
      const q = query(collection(db, "users"), where("username", "==", username));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        setUserData({ uid: docSnap.id, name: data.name ?? "(sem nome)", photoURL: data.photoURL || "/default-avatar.png" });
      } else {
        setUserData(null);
      }
      setLoading(false);
    }
    fetchUser();
  }, [username]);

  if (loading) return <Spinner />;
  if (!userData) return <div className="text-zinc-400 p-8 text-center">Usuário não encontrado.</div>;

  return (
    <main className="max-w-2xl mx-auto p-4 h-[80vh] flex flex-col">
      <ChatWindow otherUid={userData.uid} otherName={userData.name} otherPhotoURL={userData.photoURL} />
    </main>
  );
}
