"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { sendMessage, listenMessages, ChatMessage, markMessagesAsRead, deleteMessage } from "@/lib/chatService";
import { sendNotification } from "@/lib/notificationService";
import { Timestamp } from "firebase/firestore";
import { clearChatMessages, deleteChat } from "@/lib/chatAdminService";
import { MdMoreVert, MdClose, MdAttachFile, MdSend, MdMic, MdStop } from "react-icons/md";

const VerifiedBadge = React.lazy(() => import("@/components/VerifiedBadge"));

type Props = {
  otherUid: string;
  otherName: string;
  otherPhotoURL: string;
  otherVerified?: boolean;
};

export default function ChatWindow({ otherUid, otherName, otherPhotoURL, otherVerified }: Props) {
  const { user } = useAuth();
  // Detecta o status de verificado via query param se não vier por prop
  let verified = otherVerified;
  if (typeof window !== 'undefined' && verified === undefined) {
    const urlParams = new URLSearchParams(window.location.search);
    verified = urlParams.get('verified') === '1';
  }
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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

  // Gravação de áudio
  async function startRecording() {
    setAudioBlob(null);
    setAudioPreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioPreview(URL.createObjectURL(blob));
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      alert('Não foi possível acessar o microfone.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function cancelAudio() {
    setAudioBlob(null);
    setAudioPreview(null);
    setRecording(false);
  }

  // handleSend original (chat)
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!text.trim() && !mediaFile && !audioBlob) || !user) return;
    // Verifica se o destinatário bloqueou o usuário logado
    const { doc, getDoc } = await import('firebase/firestore');
    const db = (await import('@/lib/firestore')).default;
    const otherUserDoc = await getDoc(doc(db, 'users', otherUid));
    const blockedUsers = otherUserDoc.exists() ? otherUserDoc.data().blockedUsers || [] : [];
    if (blockedUsers.includes(user.uid)) {
      alert('Usuário não encontrado.');
      return;
    }
    let fileToSend = mediaFile;
    if (mediaFile && mediaFile.type.startsWith('image/') && !mediaFile.type.includes('webp')) {
      try {
        fileToSend = await convertToWebP(mediaFile);
      } catch (e) {
        alert('Falha ao converter imagem para WebP. Enviando original.');
      }
    }
    if (audioBlob) {
      fileToSend = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    }
    await sendMessage(user.uid, otherUid, text.trim(), fileToSend || undefined);
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
    setAudioBlob(null);
    setAudioPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-900 rounded-lg border border-zinc-800 shadow">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800 relative">
        <Image
          src={otherPhotoURL}
          alt={otherName}
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover border border-zinc-700"
          priority
        />
        <span className="text-zinc-100 font-semibold flex items-center">
          {otherName}
          {verified && (
            <Suspense fallback={null}>
              <VerifiedBadge />
            </Suspense>
          )}
        </span>
        <button
          className="ml-auto p-2 rounded hover:bg-zinc-800 transition relative"
          title="Opções do chat"
          onClick={() => setShowOptions((v) => !v)}
        >
          <MdMoreVert className="w-6 h-6 text-zinc-400" />
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
            <div className={`px-3 py-2 rounded-lg max-w-xs md:max-w-md lg:max-w-lg text-sm relative ${msg.from === user?.uid ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-100'}`}>
              {/* Exibe imagem/vídeo/áudio se houver */}
              {msg.imageURL && (
                <Image src={msg.imageURL} alt="imagem" width={320} height={192} className="max-h-48 max-w-full rounded border border-zinc-700 object-contain mb-2" />
              )}
              {msg.videoURL && (
                <video src={msg.videoURL} controls className="max-h-48 w-full min-w-[220px] max-w-[340px] md:max-w-[420px] rounded border border-zinc-700 object-contain mb-2 bg-black" style={{background:'#18181b'}} />
              )}
              {msg.audioURL && (
                <audio src={msg.audioURL} controls className="w-full min-w-[220px] max-w-[340px] md:max-w-[420px] mb-2" />
              )}
              {msg.text}
              <div className="text-xs text-zinc-400 mt-1 text-right">{msg.createdAt.toDate().toLocaleTimeString()}</div>
              {msg.from === user?.uid && (
                <button
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-zinc-800 bg-opacity-80 rounded p-1 text-xs text-red-400 hover:text-red-600"
                  title="Apagar mensagem"
                  onClick={async () => {
                    if (window.confirm('Deseja apagar esta mensagem?')) {
                      await deleteMessage(chatId, msg.id!, msg.imageURL, msg.videoURL, msg.audioURL);
                    }
                  }}
                >
                  <MdClose className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 min-w-[120px] px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none"
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
        <label htmlFor="chatFileInput" className="cursor-pointer inline-block bg-zinc-700 text-white px-3 py-2 rounded hover:bg-zinc-600 mr-2" title="Anexar arquivo">
          <MdAttachFile className="w-5 h-5 inline" />
        </label>
        {/* Botão de gravação de áudio */}
        {!recording && !audioBlob && (
          <button type="button" onClick={startRecording} className="bg-zinc-700 text-white px-3 py-2 rounded hover:bg-zinc-600 mr-2 flex items-center justify-center" title="Gravar áudio">
            <MdMic className="w-6 h-6 block" />
          </button>
        )}
        {recording && (
          <button type="button" onClick={stopRecording} className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 mr-2 animate-pulse" title="Parar gravação">
            <MdStop className="w-5 h-5 inline" />
            Gravando...
          </button>
        )}
        {audioPreview && !recording && (
          <div className="flex items-center gap-1 mr-2">
            <audio src={audioPreview} controls className="max-w-[120px]" />
            <button type="button" onClick={cancelAudio} className="text-red-400 hover:text-red-600 text-xl">&times;</button>
          </div>
        )}
        {mediaPreview && (
          <div className="relative">
            {mediaFile?.type.startsWith('image/') ? (
              <Image src={mediaPreview} alt="Preview" width={64} height={64} className="max-h-16 rounded border border-zinc-700 object-contain" />
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
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          title="Enviar mensagem"
        >
          <MdSend className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
