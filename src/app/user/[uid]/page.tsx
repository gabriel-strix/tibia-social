// src/app/user/[uid]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import db from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import Comment from "@/components/Comment";
import RequireAuth from "@/components/RequireAuth";

type Post = {
  id: string;
  uid: string;
  name: string;
  photoURL: string;
  text: string;
  createdAt: Timestamp;
  likes?: string[];
};

type CommentType = {
  id: string;
  uid: string;
  name: string;
  photoURL: string;
  text: string;
  createdAt: Timestamp;
  likes?: string[];
};

export default function UserFeedPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const router = useRouter();
  // params.uid pode ser null, então garantir fallback seguro
  const uid = params?.uid ? String(params.uid) : "";
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentType[]>>({});
  const [textMap, setTextMap] = useState<Record<string, string>>({});
  const [commentTextMap, setCommentTextMap] = useState<Record<string, string>>({});

  // Proteção de rota: se não existe usuário, manda pro login
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Busca posts do usuário específico
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "posts"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ ...(d.data() as Post), id: d.id })));
    });
    return () => unsub();
  }, [uid]);

  // Escuta comentários de cada post em tempo real
  useEffect(() => {
    if (!posts.length) return;
    const unsubList = posts.map((post) => {
      const q = query(
        collection(db, "posts", post.id, "comments"),
        orderBy("createdAt", "asc")
      );
      return onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as CommentType), id: d.id }));
        setCommentsMap((prev) => ({ ...prev, [post.id]: list }));
      });
    });
    return () => unsubList.forEach((unsub) => unsub());
  }, [posts]);

  // Publicar comentário
  async function handlePostReply(postId: string) {
    const txt = commentTextMap[postId]?.trim();
    if (!txt || !user) return;
    await addDoc(collection(db, "posts", postId, "comments"), {
      uid: user.uid,
      name: user.displayName!,
      photoURL: user.photoURL!,
      text: txt,
      createdAt: Timestamp.now(),
      likes: []
    });
    setCommentTextMap((m) => ({ ...m, [postId]: "" }));
  }

  // Curtir / Descurtir post
  async function toggleLikePost(post: Post) {
    if (!user) return;
    const liked = post.likes?.includes(user.uid);
    const newLikes = liked
      ? post.likes!.filter((u) => u !== user.uid)
      : [...(post.likes || []), user.uid];
    await updateDoc(doc(db, "posts", post.id), { likes: newLikes });
  }

  // Curtir / Descurtir comentário
  async function toggleLikeComment(postId: string, comment: CommentType) {
    if (!user) return;
    const liked = comment.likes?.includes(user.uid);
    const newLikes = liked
      ? comment.likes!.filter((u) => u !== user.uid)
      : [...(comment.likes || []), user.uid];
    await updateDoc(doc(db, "posts", postId, "comments", comment.id), {
      likes: newLikes
    });
  }

  // Atualizar comentário
  async function handleUpdateComment(postId: string, commentId: string, newText: string) {
    await updateDoc(doc(db, "posts", postId, "comments", commentId), { text: newText });
  }

  // Excluir comentário
  async function handleDeleteComment(postId: string, commentId: string) {
    await deleteDoc(doc(db, "posts", postId, "comments", commentId));
  }

  if (loading) return <p className="text-zinc-200">Carregando...</p>;
  if (!posts.length) return <p className="text-zinc-400">Nenhum post deste usuário.</p>;

  return (
    <RequireAuth>
      <div className="flex justify-center w-full min-h-screen bg-zinc-950 pt-4">
        {/* Feed centralizado do usuário */}
        <div className="w-full max-w-xl flex flex-col gap-8 mt-4">
          <h1 className="text-2xl font-bold mb-6 text-zinc-100 text-center">Feed de {posts[0].name}</h1>
          <div className="flex flex-col gap-8">
            {posts.map((post) => {
              const likedPost = post.likes?.includes(user!.uid) ?? false;
              const comments = commentsMap[post.id] || [];
              const newText = textMap[post.id] || "";
              const newComment = commentTextMap[post.id] || "";

              return (
                <div
                  key={post.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg shadow p-0 flex flex-col"
                >
                  {/* Header do post */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <img
                      src={post.photoURL}
                      width={40}
                      height={40}
                      className="rounded-full border border-zinc-700"
                      alt={post.name}
                    />
                    <strong className="text-zinc-100">{post.name}</strong>
                  </div>
                  {/* Texto do post */}
                  <div className="px-4 py-2">
                    <p className="text-zinc-200 whitespace-pre-line mb-2">{post.text}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => toggleLikePost(post)}
                        className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${likedPost ? 'bg-pink-700 text-white' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'}`}
                      >
                        {likedPost ? "💔 Descurtir" : "❤️ Curtir"} ({post.likes?.length || 0})
                      </button>
                    </div>
                  </div>
                  {/* Comentários */}
                  <div className="px-4 pb-4">
                    <strong className="text-zinc-100">Comentários</strong>
                    {comments.length === 0 && <p className="text-zinc-400">Sem comentários ainda.</p>}
                    {comments.map((c) => (
                      <Comment
                        key={c.id}
                        id={c.id}
                        uid={c.uid}
                        name={c.name}
                        photoURL={c.photoURL}
                        text={c.text}
                        likes={c.likes}
                        currentUserUid={user!.uid}
                        onLike={() => toggleLikeComment(post.id, c)}
                        onUpdate={(id, newText) => handleUpdateComment(post.id, id, newText)}
                        onDelete={(id) => handleDeleteComment(post.id, id)}
                      />
                    ))}
                    <textarea
                      placeholder="Comentar..."
                      value={newComment}
                      onChange={(e) =>
                        setCommentTextMap((m) => ({ ...m, [post.id]: e.target.value }))
                      }
                      rows={2}
                      className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mt-2"
                    />
                    <button
                      onClick={() => handlePostReply(post.id)}
                      className="mt-2 px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >Enviar comentário</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Sidebar à direita */}
        <aside className="hidden lg:flex flex-col w-80 ml-8 mt-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow flex flex-col items-center">
            <img src={posts[0]?.photoURL || '/default-avatar.png'} alt="avatar" className="w-16 h-16 rounded-full border-2 border-zinc-700 mb-2" />
            <span className="text-zinc-100 font-semibold text-lg">{posts[0]?.name}</span>
            <span className="text-zinc-400 text-sm mt-1">Perfil público</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow">
            <h3 className="text-zinc-200 font-bold mb-2 text-lg">Sobre este usuário</h3>
            <p className="text-zinc-400 text-sm">Aqui pode ser exibida uma bio, conquistas ou sugestões de interação.</p>
          </div>
        </aside>
      </div>
    </RequireAuth>
  );
}
