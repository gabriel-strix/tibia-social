"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, getDocs, doc, getDoc, orderBy, limit } from "firebase/firestore";
import db from "@/lib/firestore";
import Link from "next/link";
import { ChatMessage } from "@/lib/chatService";

interface ConversationPreview {
  uid: string;
  name: string;
  photoURL: string;
  lastMessage?: string;
  lastTime?: string;
  unread?: boolean;
  lastTimestamp?: number; // Corrigido para permitir ordenação
}

export default function ChatList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);

  useEffect(() => {
    if (!user) return;
    async function fetchConversations() {
      if (!user) return; // Garante que user não é nulo dentro da função
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef);
      const snapshot = await getDocs(q);
      const previews: ConversationPreview[] = [];
      for (const docSnap of snapshot.docs) {
        const chatId = docSnap.id;
        const lastUnderscore = chatId.lastIndexOf("_");
        if (lastUnderscore === -1) continue;
        const uid1 = chatId.slice(0, lastUnderscore);
        const uid2 = chatId.slice(lastUnderscore + 1);
        // Comparação insensível a maiúsculas/minúsculas e espaços
        const userUidNorm = user.uid.trim().toLowerCase();
        const uid1Norm = uid1.trim().toLowerCase();
        const uid2Norm = uid2.trim().toLowerCase();
        if (uid1Norm !== userUidNorm && uid2Norm !== userUidNorm) continue;
        const otherUid = uid1Norm === userUidNorm ? uid2 : uid1;
        // Busca dados do outro usuário
        const userDoc = await getDoc(doc(db, "users", otherUid));
        if (!userDoc.exists()) continue;
        const data = userDoc.data();
        // Busca última mensagem
        const messagesRef = collection(db, "chats", chatId, "messages");
        const lastMsgQ = query(messagesRef, orderBy("createdAt", "desc"), limit(1));
        const lastMsgSnap = await getDocs(lastMsgQ);
        let lastMessage = "", lastTime = "", lastTimestamp = 0, unread = false;
        if (!lastMsgSnap.empty) {
          const msg = lastMsgSnap.docs[0].data() as ChatMessage;
          lastMessage = msg.text;
          lastTime = msg.createdAt?.toDate?.().toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" }) || "";
          lastTimestamp = msg.createdAt?.toMillis?.() || 0;
          // Se a última mensagem foi recebida e não lida
          if (msg.to === user.uid && (!msg.readBy || !msg.readBy.includes(user.uid))) unread = true;
        }
        // Só mostra chats com pelo menos uma mensagem
        if (lastMessage) {
          previews.push({
            uid: otherUid,
            name: data?.name ?? "(sem nome)",
            photoURL: data?.photoURL || "/default-avatar.png",
            lastMessage,
            lastTime,
            unread,
            lastTimestamp,
          });
        }
      }
      // Ordena por timestamp real da última mensagem (desc)
      previews.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
      setConversations(previews);
    }
    fetchConversations();
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-zinc-200 text-lg font-semibold mb-2">Conversas</h2>
      {conversations.length === 0 && <div className="text-zinc-400">Nenhuma conversa ainda.</div>}
      {conversations.map(conv => (
        <Link key={conv.uid} href={`/chat/${conv.uid}`} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-800 transition relative group">
          <img src={conv.photoURL} alt={conv.name} className="w-8 h-8 rounded-full border border-zinc-700" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-zinc-100 font-semibold truncate">{conv.name}</span>
              {conv.lastTime && <span className="text-xs text-zinc-400 ml-auto">{conv.lastTime}</span>}
            </div>
            <span className={`text-sm truncate ${conv.unread ? "font-bold text-white" : "text-zinc-400"}`}>{conv.lastMessage || <i>Inicie a conversa</i>}</span>
          </div>
          {conv.unread && (
            <span className="absolute right-2 top-1 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 shadow">•</span>
          )}
        </Link>
      ))}
    </div>
  );
}
