"use client";
import { useEffect, useState } from "react";
import { MdFavorite } from "react-icons/md";
import FeedPost from "@/components/FeedPost";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getPostById } from "@/lib/postService";
import { Timestamp, doc, updateDoc, deleteDoc, collection, addDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import db from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import Comment from "@/components/Comment";
import React, { Suspense } from "react";
const VerifiedBadge = React.lazy(() => import("@/components/VerifiedBadge"));
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
  const [authorUsername, setAuthorUsername] = useState<string | undefined>(undefined);
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
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs;
      const commentsWithUsername = await Promise.all(docs.map(async (doc) => {
        const data = doc.data();
        // Se já tem username e verified, retorna direto
        if (typeof data.verified !== 'undefined' && data.username) return { id: doc.id, ...data };
        // Busca username e verified pelo uid
        const { doc: docRef, getDoc } = await import("firebase/firestore");
        const db = (await import("@/lib/firestore")).default;
        const userDoc = await getDoc(docRef(db, "users", data.uid));
        const username = userDoc.exists() ? userDoc.data().username : undefined;
        const verified = userDoc.exists() ? userDoc.data().verified : false;
        return { id: doc.id, ...data, username, verified };
      }));
      setComments(commentsWithUsername);
    });
    return () => unsubscribe();
  }, [postId, post]);

  useEffect(() => {
    if (post && post.uid) {
      (async () => {
        const { doc, getDoc } = await import("firebase/firestore");
        const db = (await import("@/lib/firestore")).default;
        const userDoc = await getDoc(doc(db, "users", post.uid));
        if (userDoc.exists()) setAuthorUsername(userDoc.data().username);
      })();
    }
  }, [post]);

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
      <div className="flex justify-center w-full mt-8 px-2 md:px-0">
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <FeedPost
            post={post}
            authorUsername={authorUsername}
            user={user}
            liked={liked}
            isOwner={isOwner}
            onLike={toggleLike}
            onEdit={() => { setEditingPost(true); setEditingText(post.text); }}
            onDelete={handleDeletePost}
            onReport={async () => {
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
            editingPost={editingPost}
            editingText={editingText}
            setEditingText={setEditingText}
            handleEditPost={handleEditPost}
            setEditingPost={setEditingPost}
            setModalImage={setModalImage}
          />
          {/* Comentários */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow p-6 mt-6">
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
                username={comment.username}
                verified={comment.verified}
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
            <Image
              src={modalImage as string}
              alt="Imagem ampliada"
              width={900}
              height={900}
              className="max-h-[90vh] max-w-[90vw] rounded shadow-lg border-4 border-zinc-800"
            />
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
