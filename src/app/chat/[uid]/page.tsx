"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import { doc, getDoc } from "firebase/firestore";
import db from "@/lib/firestore";
import RequireAuth from "@/components/RequireAuth";

export default function ChatWithUserPage() {
  return (
    <RequireAuth>
      <ChatWithUserContent />
    </RequireAuth>
  );
}

function ChatWithUserContent() {
  const params = useParams<{ uid?: string }>();
  const uid = params?.uid || "";
  const [userData, setUserData] = useState<{ name: string; photoURL: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!uid) return;
    async function fetchUser() {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({ name: data?.name ?? "(sem nome)", photoURL: data?.photoURL || "/default-avatar.png" });
      } else {
        router.push("/chat");
      }
    }
    fetchUser();
  }, [uid, router]);

  if (!userData) return <div className="text-zinc-400 p-8 text-center">Carregando...</div>;

  return (
    <main className="max-w-2xl mx-auto p-4 h-[80vh] flex flex-col">
      <ChatWindow otherUid={uid} otherName={userData.name} otherPhotoURL={userData.photoURL} />
    </main>
  );
}
