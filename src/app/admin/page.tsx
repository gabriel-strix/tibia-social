"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import db from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function AdminPanel() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    // Permissão: só admin
    if (!user.isAdmin) {
      router.push("/");
      return;
    }
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user, router]);

  async function resolveReport(id: string, action: string) {
    await updateDoc(doc(db, "reports", id), { resolved: true, actionTaken: action });
    setReports((prev) => prev.map(r => r.id === id ? { ...r, resolved: true, actionTaken: action } : r));
  }
  async function deleteContent(type: string, contentId: string, postId?: string, reportId?: string) {
    if (type === "post") {
      await deleteDoc(doc(db, "posts", contentId));
      if (reportId) await resolveReport(reportId, 'conteúdo excluído');
      alert('Post excluído!');
    }
    if (type === "comment" && postId) {
      await deleteDoc(doc(db, "posts", postId, "comments", contentId));
      if (reportId) await resolveReport(reportId, 'comentário excluído');
      alert('Comentário excluído!');
    } else if (type === "comment" && !postId) {
      alert('postId não informado para exclusão de comentário.');
    }
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-zinc-950 pt-4">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Painel Administrativo</h1>
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {reports.length === 0 && <div className="text-zinc-400 text-center">Nenhuma denúncia.</div>}
        {reports.map((r) => (
          <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <img src={r.reportedUserPhotoURL} alt={r.reportedUserName} className="w-10 h-10 rounded-full border border-zinc-700" />
              <span className="text-zinc-100 font-semibold">{r.reportedUserName}</span>
              <span className="ml-auto text-xs text-zinc-400">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
            </div>
            <div className="text-zinc-200 text-sm">Conteúdo: <span className="font-mono">{r.contentText}</span></div>
            <div className="text-zinc-400 text-xs">Motivo: {r.reason}</div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => deleteContent(r.type, r.contentId, r.postId, r.id)} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-xs">Excluir conteúdo</button>
              <button onClick={() => resolveReport(r.id, 'descartada')} className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold text-xs">Descartar</button>
              <button onClick={() => resolveReport(r.id, 'resolvida')} className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white font-semibold text-xs">Marcar como resolvida</button>
            </div>
            {r.resolved && <div className="text-xs text-green-400 mt-1">Denúncia resolvida: {r.actionTaken}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
