"use client";
import FollowersListPage from "@/components/FollowersListPage";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import db from "@/lib/firestore";
import { query, where, collection, getDocs } from "firebase/firestore";

export default function ProfileFollowersByUsernamePage() {
  const params = useParams<{ username?: string }>();
  const username = params?.username;
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUid() {
      if (!username) return;
      const q = query(collection(db, "users"), where("username", "==", username));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setUid(snap.docs[0].id);
      } else {
        setUid(null);
      }
      setLoading(false);
    }
    fetchUid();
  }, [username]);

  if (loading) return <p className="text-zinc-200">Carregando...</p>;
  if (!uid) return <p>Usuário não encontrado.</p>;
  return <FollowersListPage profileUid={uid} type="followers" />;
}
