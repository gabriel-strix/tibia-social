import React, { useEffect, useState, Suspense } from "react";
import { collection, getDocs } from "firebase/firestore";
import db from "@/lib/firestore";
const VerifiedBadge = React.lazy(() => import("@/components/VerifiedBadge"));

interface Props {
  uids: string[];
  currentUserUid: string;
}

export default function LikeAvatars({ uids, currentUserUid }: Props) {
  const [users, setUsers] = useState<{ uid: string; name: string; photoURL: string; username?: string; verified?: boolean }[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      if (uids.length === 0) {
        setUsers([]);
        return;
      }
      // Busca apenas os usuários necessários, não todos
      const usersCol = collection(db, "users");
      const snap = await getDocs(usersCol);
      const result = snap.docs
        .filter((doc) => uids.includes(doc.id))
        .map((doc) => {
          const data = doc.data();
          return { uid: doc.id, name: data.name || "(sem nome)", photoURL: data.photoURL || "/default-avatar.png", username: data.username, verified: data.verified || false };
        });
      // Ordena para mostrar o usuário atual primeiro, depois os outros
      result.sort((a, b) => (a.uid === currentUserUid ? -1 : b.uid === currentUserUid ? 1 : 0));
      setUsers(result);
    }
    fetchUsers();
  }, [uids, currentUserUid]);

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Avatares sobrepostos */}
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((u, i) => (
          <a
            key={u.uid}
            href={`/profile/${u.username || u.uid}`}
            tabIndex={0}
            aria-label={`Ver perfil de ${u.name}`}
          >
            <span className="relative flex items-center">
              <img
                src={u.photoURL || '/default-avatar.png'}
                alt={u.name}
                title={u.name + (u.uid === currentUserUid ? " (você)" : "")}
                className={`w-7 h-7 rounded-full object-cover border-2 border-zinc-800 bg-zinc-900 ${i === 0 ? "z-10" : i === 1 ? "z-9" : "z-8"}`}
                style={{ boxShadow: "0 0 0 2px #18181b" }}
                onError={e => { e.currentTarget.src = '/default-avatar.png'; }}
              />
              {/* selo removido */}
            </span>
          </a>
        ))}
      </div>
      {/* Texto de curtidas */}
      <span className="text-xs text-zinc-400 ml-2">
        {users.length === 1 && (
          users[0].uid === currentUserUid ? (
            <>
              <a href={`/profile/${users[0].username || users[0].uid}`} className="hover:underline text-blue-400">Você</a> curtiu
            </>
          ) : (
            <>
              <a href={`/profile/${users[0].username || users[0].uid}`} className="hover:underline text-blue-400">{users[0].name}</a> curtiu
            </>
          )
        )}
        {users.length === 2 && (
          <>
            <a href={`/profile/${users[0].username || users[0].uid}`} className="hover:underline text-blue-400">{users[0].uid === currentUserUid ? "Você" : users[0].name}</a> e <a href={`/profile/${users[1].username || users[1].uid}`} className="hover:underline text-blue-400">{users[1].uid === currentUserUid ? "você" : users[1].name}</a> curtiram
          </>
        )}
        {users.length > 2 && (
          <>
            <a href={`/profile/${users[0].username || users[0].uid}`} className="hover:underline text-blue-400">{users[0].uid === currentUserUid ? "Você" : users[0].name}</a> e outros {users.length - 1} curtiram
          </>
        )}
      </span>
    </div>
  );
}
