"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getPostById } from "@/lib/postService";
import { Timestamp, doc, updateDoc, deleteDoc, collection, addDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import db from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import Comment from "@/components/Comment";
import { sendNotification } from "@/lib/notificationService";
import { sendReport } from "@/lib/reportService";
import InstagramVideo from "@/components/InstagramVideo";
import RequireAuth from "@/components/RequireAuth";

// Corrige obtenção do postId para Next.js 14+ e checagem de user
export default function PostPage() {
  const params = useParams();
  const postId = params && typeof params.postId === 'string' ? params.postId : Array.isArray(params?.postId) ? params.postId[0] : '';
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [editingPost, setEditingPost] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [modalImage, setModalImage] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!postId) return;
    async function fetchPost() {
      const p = await getPostById(postId);
      if (!p) return router.push("/feed");
      setPost(p);
    }
    fetchPost();
  }, [postId, router]);

  useEffect(() => {
    if (!post) return;
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [postId, post]);

  if (!post) return <div className="text-zinc-400 p-8 text-center">Carregando post...</div>;
  if (loading) return <div className="text-zinc-400 p-8 text-center">Carregando...</div>;
  if (!user) return null;

  const isOwner = post.uid === user.uid;
  const liked = post.likes?.includes(user.uid) ?? false;

  async function toggleLike() {
    if (!user) return;
    const newLikes = liked
      ? post.likes?.filter((uid: string) => uid !== user.uid)
      : [...(post.likes || []), user.uid];
    await updateDoc(doc(db, "posts", postId), { likes: newLikes });
    setPost({ ...post, likes: newLikes });
    if (!liked && post.uid !== user.uid) {
      await sendNotification({
        toUid: post.uid,
        fromUid: user.uid,
        fromName: user.displayName || "",
        fromPhotoURL: user.photoURL || "",
        type: "like",
        text: `${user.displayName} curtiu seu post!`,
        postId,
        createdAt: Timestamp.now(),
      });
    }
  }

  async function handleAddComment() {
    if (!user || !commentText.trim()) return;
    await addDoc(collection(db, "posts", postId, "comments"), {
      uid: user.uid,
      name: user.displayName || "",
      photoURL: user.photoURL || "",
      text: commentText.trim(),
      createdAt: Timestamp.now(),
      likes: [],
    });
    if (post.uid !== user.uid) {
      await sendNotification({
        toUid: post.uid,
        fromUid: user.uid,
        fromName: user.displayName || "",
        fromPhotoURL: user.photoURL || "",
        type: "comment",
        text: `${user.displayName} comentou no seu post: \"${commentText.trim()}\"`,
        postId,
        createdAt: Timestamp.now(),
      });
    }
    setCommentText("");
  }

  async function handleEditPost() {
    if (!editingText.trim()) return;
    await updateDoc(doc(db, "posts", postId), { text: editingText });
    setPost({ ...post, text: editingText });
    setEditingPost(false);
    setEditingText("");
  }

  async function handleDeletePost() {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;
    await deleteDoc(doc(db, "posts", postId));
    router.push("/feed");
  }

  async function handleUpdateComment(id: string, newText: string) {
    await updateDoc(doc(db, "posts", postId, "comments", id), { text: newText });
  }

  async function handleDeleteComment(id: string) {
    await deleteDoc(doc(db, "posts", postId, "comments", id));
  }

  async function handleLikeComment(comment: any) {
    if (!user) return;
    const liked = comment.likes?.includes(user.uid);
    const newLikes = liked
      ? comment.likes?.filter((uid: string) => uid !== user.uid)
      : [...(comment.likes || []), user.uid];
    await updateDoc(doc(db, "posts", postId, "comments", comment.id), { likes: newLikes });
  }

  return (
    <RequireAuth>
      <div className="flex justify-center w-full min-h-screen bg-zinc-950 pt-4">
        <div className="w-full max-w-xl flex flex-col gap-8 mt-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <a href={`/profile/${post.uid}`}>
                <img src={post.photoURL || '/default-avatar.png'} alt={post.name} className="w-10 h-10 rounded-full border border-zinc-700 hover:ring-2 hover:ring-blue-500 transition" />
              </a>
              <a href={`/profile/${post.uid}`} className="text-zinc-100 font-semibold hover:underline">
                {post.name}
              </a>
              <span className="ml-auto text-xs text-zinc-400">{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
            </div>
            {post.imageURL && (
              <>
                <img
                  src={post.imageURL}
                  alt="Imagem do post"
                  className="w-full max-h-[400px] object-cover bg-zinc-800 border-b border-zinc-800 cursor-pointer transition hover:brightness-75"
                  onClick={() => setModalImage(post.imageURL)}
                />
              </>
            )}
            {post.videoURL && (
              <InstagramVideo src={post.videoURL} />
            )}
            {editingPost ? (
              <div className="flex flex-col gap-2 mt-2">
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  rows={3}
                  className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditPost}
                    className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >Salvar</button>
                  <button
                    onClick={() => setEditingPost(false)}
                    className="px-4 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold"
                  >Cancelar</button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-200 whitespace-pre-line mb-2">{post.text}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={toggleLike}
                className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${liked ? 'bg-pink-700 text-white' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'}`}
              >
                {liked ? "💔 Descurtir" : "❤️ Curtir"} ({post.likes?.length || 0})
              </button>
              {/* Botão de denúncia de post no individual */}
              {!isOwner && post.uid !== user.uid && (
                <button
                  onClick={async () => {
                    const reason = prompt('Descreva o motivo da denúncia:');
                    if (!reason) return;
                    await sendReport({
                      type: "post",
                      contentId: post.id,
                      contentText: post.text,
                      reportedByUid: user.uid,
                      reportedByName: user.displayName || "",
                      reportedByPhotoURL: user.photoURL || "",
                      reportedUserUid: post.uid,
                      reportedUserName: post.name,
                      reportedUserPhotoURL: post.photoURL,
                      reason,
                      createdAt: Timestamp.now(),
                    });
                    alert('Denúncia enviada!');
                  }}
                  className="px-3 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-semibold text-xs"
                >Denunciar</button>
              )}
              {isOwner && !editingPost && (
                <>
                  <button
                    onClick={() => { setEditingPost(true); setEditingText(post.text); }}
                    className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
                  >Editar</button>
                  <button
                    onClick={handleDeletePost}
                    className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >Excluir</button>
                </>
              )}
            </div>
          </div>
          {/* Comentários */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow p-6">
            <strong className="text-zinc-100">Comentários</strong>
            {comments.length === 0 && <p className="text-zinc-400">Sem comentários ainda.</p>}
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                id={comment.id}
                uid={comment.uid}
                name={comment.name}
                photoURL={comment.photoURL}
                text={comment.text}
                likes={comment.likes}
                currentUserUid={user.uid}
                onUpdate={handleUpdateComment}
                onDelete={handleDeleteComment}
                onLike={() => handleLikeComment(comment)}
                onReport={async (reason) => {
                  if (comment.uid === user.uid) return; // Não pode denunciar o próprio comentário
                  await sendReport({
                    type: "comment",
                    contentId: comment.id,
                    contentText: comment.text,
                    reportedByUid: user.uid,
                    reportedByName: user.displayName || "",
                    reportedByPhotoURL: user.photoURL || "",
                    reportedUserUid: comment.uid,
                    reportedUserName: comment.name,
                    reportedUserPhotoURL: comment.photoURL,
                    reason,
                    createdAt: Timestamp.now(),
                  });
                  alert('Denúncia enviada!');
                }}
              />
            ))}
            <textarea
              placeholder="Escreva um comentário..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mt-2"
            />
            <button
              onClick={handleAddComment}
              className="mt-2 px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >Comentar</button>
          </div>
        </div>
        {modalImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" onClick={() => setModalImage(null)}>
            <img src={modalImage} alt="Imagem ampliada" className="max-h-[90vh] max-w-[90vw] rounded shadow-lg border-4 border-zinc-800" />
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
