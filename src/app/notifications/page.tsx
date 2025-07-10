"use client";

import { useAuth } from "@/hooks/useAuth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import db from "@/lib/firestore";
import { useEffect, useState } from "react";
import { markAllNotificationsAsRead } from "@/lib/notificationMarkAllRead";
import { clearAllNotifications } from "@/lib/notificationClearAll";
import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/notificationService";

// Página de notificações estilo Instagram
export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[] & { id: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!user && !loading) {
      router.push("/login");
      return;
    }
    if (!user) return;
    const q = query(collection(db, "notifications", user.uid, "items"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      // Unifica notificações de mensagem recebida por usuário
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification & { id: string }));
      const grouped: Record<string, Notification & { id: string }> = {};
      const result: (Notification & { id: string })[] = [];
      for (const n of all) {
        if (n.type === "message" && n.fromUid) {
          // Se já existe, mantém só a mais recente
          if (!grouped[n.fromUid] || (n.createdAt?.toMillis?.() > grouped[n.fromUid].createdAt?.toMillis?.())) {
            grouped[n.fromUid] = n;
          }
        } else {
          result.push(n);
        }
      }
      // Adiciona as notificações de mensagem unificadas
      result.push(...Object.values(grouped));
      // Ordena por data (desc)
      result.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setNotifications(result);
    });
    return () => unsub();
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    markAllNotificationsAsRead(user.uid);
  }, [user]);

  return (
    <div className="flex justify-center w-full min-h-screen bg-zinc-950 pt-4">
      <div className="w-full max-w-xl flex flex-col gap-8 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-zinc-100 text-center flex-1">Notificações</h1>
          {user && notifications.length > 0 && (
            <button
              className="ml-4 px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-sm"
              onClick={async () => {
                if (window.confirm('Deseja limpar todas as notificações?')) {
                  await clearAllNotifications(user.uid);
                }
              }}
            >
              Limpar tudo
            </button>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {notifications.length === 0 && (
            <div className="text-zinc-400 text-center">Nenhuma notificação.</div>
          )}
          {notifications.map((n) => (
            <div key={n.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                <a href={`/profile/${n.fromUid}`} title={`Ver perfil de ${n.fromName}`}>
                  <img src={n.fromPhotoURL} alt={n.fromName} className="w-12 h-12 rounded-full border-2 border-zinc-700 hover:border-blue-500 transition object-cover" />
                </a>
              </div>
              <span className="text-zinc-100 text-base break-words max-w-xs">
                <a href={`/profile/${n.fromUid}`} className="text-blue-400 hover:underline font-semibold" title={`Ver perfil de ${n.fromName}`}>{n.fromName}</a>
                {": "}
                {n.type === "like" && n.commentId && n.postId ? (
                  <a
                    href={`/post/${n.postId}`}
                    className="text-pink-400 hover:underline"
                    title="Ver post"
                  >
                    {n.text} <span className="text-xs text-zinc-400">(comentário)</span>
                  </a>
                ) : (n.type === "comment" || n.type === "like") && n.postId ? (
                  <a
                    href={`/post/${n.postId}`}
                    className="text-blue-400 hover:underline"
                    title="Ver post"
                  >
                    {n.text}
                  </a>
                ) : n.text}
              </span>
              <span className="ml-2 text-xs text-zinc-400">{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
              {n.type === "message" && (
                <button
                  className="ml-4 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  onClick={() => window.location.href = `/chat/${n.fromUid}`}
                >
                  Abrir mensagem
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
