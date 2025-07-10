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
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Função utilitária para converter imagem para WebP
  async function convertToWebP(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas não suportado');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return reject('Falha ao converter para WebP');
          const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
          resolve(webpFile);
        }, 'image/webp', 0.92);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!text.trim() && !mediaFile) || !user) return;
    let fileToSend = mediaFile;
    if (mediaFile && mediaFile.type.startsWith('image/') && !mediaFile.type.includes('webp')) {
      try {
        fileToSend = await convertToWebP(mediaFile);
      } catch (e) {
        // fallback para original
      }
    }
    await sendMessage(user.uid, otherUid, text.trim(), fileToSend || undefined);
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
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
              {/* Exibe imagem/vídeo se houver */}
              {msg.imageURL && (
                <img src={msg.imageURL} alt="imagem" className="max-h-48 rounded border border-zinc-700 object-contain mb-2" />
              )}
              {msg.videoURL && (
                <video src={msg.videoURL} controls className="max-h-48 rounded border border-zinc-700 object-contain mb-2" />
              )}
              {msg.text}
              <div className="text-xs text-zinc-400 mt-1 text-right">{msg.createdAt.toDate().toLocaleTimeString()}</div>
              {msg.from === user?.uid && (
                <button
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-zinc-800 bg-opacity-80 rounded p-1 text-xs text-red-400 hover:text-red-600"
                  title="Apagar mensagem"
                  onClick={async () => {
                    if (window.confirm('Deseja apagar esta mensagem?')) {
                      await deleteMessage(chatId, msg.id!, msg.imageURL, msg.videoURL);
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
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 flex gap-2 items-center">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none"
        />
        {/* Input de mídia */}
        <input
          type="file"
          accept="image/*,video/*"
          ref={fileInputRef}
          className="hidden"
          id="chatFileInput"
          onChange={async (e) => {
            if (e.target.files && e.target.files[0]) {
              const file = e.target.files[0];
              if (file.type.startsWith('video/')) {
                // Checa duração do vídeo antes de permitir
                const url = URL.createObjectURL(file);
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.src = url;
                video.onloadedmetadata = () => {
                  window.URL.revokeObjectURL(url);
                  if (video.duration > 90) {
                    alert('O vídeo deve ter no máximo 1 minuto e 30 segundos.');
                    setMediaFile(null);
                    setMediaPreview(null);
                  } else {
                    setMediaFile(file);
                    setMediaPreview(url);
                  }
                };
                return;
              }
              setMediaFile(file);
              setMediaPreview(URL.createObjectURL(file));
            } else {
              setMediaFile(null);
              setMediaPreview(null);
            }
          }}
        />
        <label htmlFor="chatFileInput" className="cursor-pointer inline-block bg-zinc-700 text-white px-3 py-2 rounded hover:bg-zinc-600 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.25 0V6a7.5 7.5 0 10-15 0v4.5m16.5 0a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 10.5m19.5 0v7.125c0 1.24-1.01 2.25-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V10.5" /></svg>
        </label>
        {mediaPreview && (
          <div className="relative">
            {mediaFile?.type.startsWith('image/') ? (
              <img src={mediaPreview} alt="Preview" className="max-h-16 rounded border border-zinc-700 object-contain" />
            ) : (
              <video src={mediaPreview} controls className="max-h-16 rounded border border-zinc-700 object-contain" />
            )}
            <button
              type="button"
              className="absolute top-0 right-0 bg-zinc-800 bg-opacity-80 rounded-full p-1 text-zinc-200 hover:text-red-400"
              onClick={() => { setMediaFile(null); setMediaPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              aria-label="Remover mídia"
            >
              &times;
            </button>
          </div>
        )}
        <button type="submit" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold">Enviar</button>
      </form>
    </div>
  );
}
