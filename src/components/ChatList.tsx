"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, getDocs, doc, getDoc, orderBy, limit, onSnapshot } from "firebase/firestore";
import db from "@/lib/firestore";
import Link from "next/link";

interface UserPreview {
  uid: string;
  name: string;
  photoURL: string;
  messageCount: number;
  hasUnread?: boolean;
}

export default function ChatList() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<UserPreview[]>([]);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    async function fetchUsers() {
      // Busca usuários que sigo
      const followingSnap = await getDocs(collection(db, "users", user.uid, "following"));
      const followingUids = followingSnap.docs.map(doc => doc.id);
      // Busca usuários que me seguem
      const followersSnap = await getDocs(collection(db, "users", user.uid, "followers"));
      const followersUids = followersSnap.docs.map(doc => doc.id);
      // Junta e remove duplicados
      const allUids = Array.from(new Set([...followingUids, ...followersUids]));
      // Busca dados dos usuários e conta mensagens
      const users: UserPreview[] = [];
      for (const uid of allUids) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          users.push({
            uid,
            name: data?.name || "(sem nome)",
            photoURL: data?.photoURL || "/default-avatar.png",
            messageCount: 0 // será atualizado pelo onSnapshot
          });
        }
      }
      setAllUsers(users);
    }
    fetchUsers();
  }, [user]);

  // Atualiza contador de mensagens em tempo real
  useEffect(() => {
    if (!user || allUsers.length === 0) return;
    const unsubscribes: (() => void)[] = [];
    allUsers.forEach(u => {
      const chatId = [user.uid, u.uid].sort().join("_");
      const messagesRef = collection(db, "chats", chatId, "messages");
      const unsubscribe = onSnapshot(messagesRef, snap => {
        setMessageCounts(prev => ({ ...prev, [u.uid]: snap.size }));
        // Verifica se há mensagem não lida
        let hasUnread = false;
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.to === user.uid && (!data.readBy || !data.readBy.includes(user.uid))) {
            hasUnread = true;
          }
        });
        setUnreadMap(prev => ({ ...prev, [u.uid]: hasUnread }));
      });
      unsubscribes.push(unsubscribe);
    });
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, allUsers]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-zinc-200 text-lg font-semibold mb-2">Pessoas para conversar</h2>
      <div className="flex flex-col gap-1">
        {allUsers.length === 0 && <div className="text-zinc-400">Nenhum usuário encontrado.</div>}
        {allUsers.map(u => (
          <Link key={u.uid} href={`/chat/${u.uid}`} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-800 transition relative">
            <img src={u.photoURL || "/default-avatar.png"} alt={u.name} className="w-8 h-8 rounded-full border border-zinc-700" />
            <span className="text-zinc-100 font-semibold truncate">{u.name}</span>
            <span className="flex items-center ml-auto gap-1">
              {unreadMap[u.uid] && (
                <span className="bg-red-600 w-2 h-2 rounded-full inline-block" />
              )}
              <span className="text-xs text-zinc-400">{messageCounts[u.uid] ?? 0} msg</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
