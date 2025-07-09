"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { sendMessage, listenMessages, ChatMessage, markMessagesAsRead, deleteMessage } from "@/lib/chatService";
import { sendNotification } from "@/lib/notificationService";
import { Timestamp } from "firebase/firestore";
import { clearChatMessages, deleteChat } from "@/lib/chatAdminService";

type Props = {
  otherUid: string;
  otherName: string;
  otherPhotoURL: string;
};

export default function ChatWindow({ otherUid, otherName, otherPhotoURL }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatId = [user?.uid, otherUid].sort().join("_");

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
    // Notifica o destinatário
    if (user.uid !== otherUid) {
      await sendNotification({
        toUid: otherUid,
        fromUid: user.uid,
        fromName: user.displayName || "",
        fromPhotoURL: user.photoURL || "",
        type: "message",
        text: `${user.displayName} enviou uma mensagem para você!`,
        createdAt: Timestamp.now(),
      });
    }
    setText("");
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-lg border border-zinc-800 shadow">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800 relative">
        <img src={otherPhotoURL} alt={otherName} className="w-10 h-10 rounded-full border border-zinc-700" />
        <span className="text-zinc-100 font-semibold">{otherName}</span>
        <button
          className="ml-auto p-2 rounded hover:bg-zinc-800 transition relative"
          title="Opções do chat"
          onClick={() => setShowOptions((v) => !v)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-zinc-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm6.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm6.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
        </button>
        {showOptions && (
          <div className="absolute right-0 top-12 bg-zinc-900 border border-zinc-800 rounded shadow-lg z-50 min-w-[180px]">
            <button
              className="block w-full text-left px-4 py-2 hover:bg-zinc-800 text-zinc-100"
              onClick={async () => {
                setShowOptions(false);
                if (window.confirm('Tem certeza que deseja limpar todas as mensagens deste chat?')) {
                  await clearChatMessages(chatId);
                }
              }}
            >
              Limpar mensagens
            </button>
            <button
              className="block w-full text-left px-4 py-2 hover:bg-red-700 text-red-300"
              onClick={async () => {
                setShowOptions(false);
                if (window.confirm('Tem certeza que deseja deletar este chat? Essa ação não pode ser desfeita.')) {
                  await deleteChat(chatId);
                }
              }}
            >
              Deletar chat
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === user?.uid ? 'justify-end' : 'justify-start'} group`}>
            <div className={`px-3 py-2 rounded-lg max-w-xs text-sm relative ${msg.from === user?.uid ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-100'}`}>
              {msg.text}
              <div className="text-xs text-zinc-400 mt-1 text-right">{msg.createdAt.toDate().toLocaleTimeString()}</div>
              {msg.from === user?.uid && (
                <button
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-zinc-800 bg-opacity-80 rounded p-1 text-xs text-red-400 hover:text-red-600"
                  title="Apagar mensagem"
                  onClick={async () => {
                    if (window.confirm('Deseja apagar esta mensagem?')) {
                      await deleteMessage(chatId, msg.id!);
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
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
