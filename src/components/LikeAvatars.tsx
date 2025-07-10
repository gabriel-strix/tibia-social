import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import db from "@/lib/firestore";

interface Props {
  uids: string[];
  currentUserUid: string;
}

export default function LikeAvatars({ uids, currentUserUid }: Props) {
  const [users, setUsers] = useState<{ uid: string; name: string; photoURL: string }[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      const promises = uids.map(async (uid) => {
        const snap = await getDocs(collection(db, "users"));
        const userDoc = snap.docs.find((d) => d.id === uid);
        if (userDoc) {
          const data = userDoc.data();
          return { uid, name: data.name || "(sem nome)", photoURL: data.photoURL || "/default-avatar.png" };
        }
        return null;
      });
      const result = (await Promise.all(promises)).filter(Boolean) as { uid: string; name: string; photoURL: string }[];
      setUsers(result);
    }
    if (uids.length > 0) fetchUsers();
    else setUsers([]);
  }, [uids]);

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      {users.slice(0, 3).map((u) => (
        <img
          key={u.uid}
          src={u.photoURL}
          alt={u.name}
          title={u.name + (u.uid === currentUserUid ? ' (você)' : '')}
          className="w-6 h-6 rounded-full border-2 border-zinc-800 -ml-2 first:ml-0 bg-zinc-900"
        />
      ))}
      <span className="text-xs text-zinc-400 ml-2">
        {users.length === 1
          ? `curtiu`
          : users.length === 2
          ? `${users[0].name} e mais 1 curtiram`
          : users.length > 2
          ? `${users[0].name} e outros ${users.length - 1} curtiram`
          : null}
      </span>
    </div>
  );
}
