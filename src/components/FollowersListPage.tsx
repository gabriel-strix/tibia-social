"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import db from "@/lib/firestore";

type UserSummary = {
  uid: string;
  name: string;
  photoURL: string;
  username?: string;
};

type Props = {
  profileUid: string;
  type: "followers" | "following";
};

export default function FollowersListPage({ profileUid, type }: Props) {
  const [users, setUsers] = useState<UserSummary[]>([]);

  useEffect(() => {
    if (!profileUid) return;
    const ref = collection(db, "users", profileUid, type);
    const unsubscribe = onSnapshot(ref, async (snapshot) => {
      const uids = snapshot.docs.map((doc) => doc.id);
      const usersData: UserSummary[] = [];
      for (const uid of uids) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          usersData.push({
            uid,
            name: data?.name ?? "(sem nome)",
            photoURL: data?.photoURL ?? "/default-avatar.png",
            username: data?.username || undefined,
          });
        }
      }
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, [profileUid, type]);

  return (
    <div className="max-w-md mx-auto mt-8 bg-zinc-900 rounded-lg p-6 shadow border border-zinc-800">
      <h1 className="text-2xl font-bold text-zinc-100 mb-4">
        {type === "followers" ? "Seguidores" : "Seguindo"}
      </h1>
      {users.length === 0 ? (
        <p className="text-zinc-400">Nenhum usuário encontrado.</p>
      ) : (
        <ul>
          {users.map((f) => (
            <li key={f.uid} className="flex items-center gap-2 mb-3">
              <Link
                href={`/profile/${f.username || f.uid}`}
                className="flex items-center gap-2 hover:bg-zinc-800 rounded px-2 py-1 transition-colors"
              >
                <img
                  src={f.photoURL}
                  alt={f.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.png";
                  }}
                />
                <span className="text-zinc-100 font-medium">{f.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
