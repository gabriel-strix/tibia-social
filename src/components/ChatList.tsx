"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
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
  verified?: boolean;
}

export default function ChatList() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<UserPreview[]>([]);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
  const [usernamesMap, setUsernamesMap] = useState<Record<string, string>>({});

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
            messageCount: 0, // será atualizado pelo onSnapshot
            verified: data?.verified || false
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

  // Busca usernames dos usuários
  useEffect(() => {
    if (allUsers.length > 0) {
      const uids = allUsers.map(u => u.uid);
      Promise.all(uids.map(async uid => {
        const { doc, getDoc } = await import("firebase/firestore");
        const db = (await import("@/lib/firestore")).default;
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          return { uid, username: userDoc.data().username };
        }
        return { uid, username: undefined };
      })).then(results => {
        const map: Record<string, string> = {};
        results.forEach(({ uid, username }) => {
          if (username) map[uid] = username;
        });
        setUsernamesMap(map);
      });
    }
  }, [allUsers]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-zinc-200 text-lg font-semibold mb-2">Pessoas para conversar</h2>
      <div className="flex flex-col gap-1">
        {allUsers.length === 0 && <div className="text-zinc-400">Nenhum usuário encontrado.</div>}
        {allUsers.map(u => (
          <Link
            key={u.uid}
            href={{
              pathname: `/chat/${usernamesMap[u.uid] || u.uid}`,
              query: { verified: u.verified ? '1' : undefined }
            }}
            className="flex items-center gap-3 p-2 rounded hover:bg-zinc-800 transition relative"
          >
            <Image src={u.photoURL || "/default-avatar.png"} alt={u.name} width={32} height={32} className="w-8 h-8 rounded-full border border-zinc-700" />
            <span className="text-zinc-100 font-semibold truncate flex items-center">
              {u.name}
              {u.verified && (
                <span className="ml-1 align-middle inline-flex">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="10" fill="#3797F0" />
                    <path d="M6.5 10.5L9 13L13.5 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </span>
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
