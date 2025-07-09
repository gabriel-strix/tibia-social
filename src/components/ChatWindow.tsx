"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { sendMessage, listenMessages, ChatMessage, markMessagesAsRead } from "@/lib/chatService";

type Props = {
  otherUid: string;
  otherName: string;
  otherPhotoURL: string;
};

export default function ChatWindow({ otherUid, otherName, otherPhotoURL }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenMessages(user.uid, otherUid, setMessages);
    // Marca como lidas ao abrir o chat
    markMessagesAsRead(user.uid, otherUid);
    return unsubscribe;
  }, [user, otherUid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // Marca como lidas ao receber novas mensagens
    if (user) markMessagesAsRead(user.uid, otherUid);
  }, [messages, user, otherUid]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    await sendMessage(user.uid, otherUid, text.trim());
    setText("");
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-lg border border-zinc-800 shadow">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
        <img src={otherPhotoURL} alt={otherName} className="w-10 h-10 rounded-full border border-zinc-700" />
        <span className="text-zinc-100 font-semibold">{otherName}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === user?.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-3 py-2 rounded-lg max-w-xs text-sm ${msg.from === user?.uid ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-100'}`}>
              {msg.text}
              <div className="text-xs text-zinc-400 mt-1 text-right">{msg.createdAt.toDate().toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none"
        />
        <button type="submit" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold">Enviar</button>
      </form>
    </div>
  );
}
