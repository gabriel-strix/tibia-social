"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import db from "@/lib/firestore";

type UserSummary = {
  uid: string;
  name: string;
  photoURL: string;
  username?: string;
};

type Props = {
  profileUid: string;
  username?: string;
};

export default function FollowersFollowing({ profileUid, username }: Props) {
  const [followers, setFollowers] = useState<UserSummary[]>([]);
  const [following, setFollowing] = useState<UserSummary[]>([]);
  const router = useRouter();

  // Função que recebe array de uids e retorna array com dados completos do usuário
  async function fetchUsersData(uids: string[]): Promise<UserSummary[]> {
    const usersData: UserSummary[] = [];

    for (const uid of uids) {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log(`Dados do usuário ${uid}:`, data); // <-- debug aqui

        usersData.push({
          uid,
          name: data?.name ?? "(sem nome)",
          photoURL:
            data?.photoURL && typeof data.photoURL === "string" && data.photoURL.trim() !== ""
              ? data.photoURL
              : "/default-avatar.png",
        });
      } else {
        console.warn(`Usuário ${uid} não encontrado na coleção users`);
      }
    }

    return usersData;
  }

  useEffect(() => {
    if (!profileUid) return;

    const followersRef = collection(db, "users", profileUid, "followers");
    const unsubscribeFollowers = onSnapshot(followersRef, async (snapshot) => {
      const followerUids = snapshot.docs.map((doc) => doc.id);
      const fullFollowersData = await fetchUsersData(followerUids);
      setFollowers(fullFollowersData);
    });

    const followingRef = collection(db, "users", profileUid, "following");
    const unsubscribeFollowing = onSnapshot(followingRef, async (snapshot) => {
      const followingUids = snapshot.docs.map((doc) => doc.id);
      const fullFollowingData = await fetchUsersData(followingUids);
      setFollowing(fullFollowingData);
    });

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [profileUid]);

  return (
    <div className="mt-6 bg-zinc-900 rounded-lg p-4 shadow border border-zinc-800 flex gap-8 justify-center w-full max-w-md mx-auto">
      <button
        className="flex flex-col items-center group bg-transparent border-none cursor-pointer"
        onClick={() => router.push(`/profile/${username || profileUid}/followers`)}
      >
        <span className="text-lg font-bold text-zinc-100 group-hover:text-blue-400 transition">
          {followers.length}
        </span>
        <span className="text-zinc-400 text-xs group-hover:text-blue-400 transition">
          Seguidores
        </span>
      </button>
      <button
        className="flex flex-col items-center group bg-transparent border-none cursor-pointer"
        onClick={() => router.push(`/profile/${username || profileUid}/following`)}
      >
        <span className="text-lg font-bold text-zinc-100 group-hover:text-blue-400 transition">
          {following.length}
        </span>
        <span className="text-zinc-400 text-xs group-hover:text-blue-400 transition">
          Seguindo
        </span>
      </button>
    </div>
  );
}

// Adicione este utilitário para fallback de imagem em todos os lugares que exibe avatar:
// Exemplo de uso:
// <img src={f.photoURL} ... onError={e => { e.currentTarget.src = '/default-avatar.png'; }} />
//
// Para aplicar no FollowersListPage, Explore, etc, repita o mesmo padrão.
