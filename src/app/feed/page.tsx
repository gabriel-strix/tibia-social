"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  where,
  setDoc,
  deleteDoc as deleteFollowDoc,
  getDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import db from "@/lib/firestore";
import Comment from "@/components/Comment";
import Link from "next/link";
import { sendNotification } from "@/lib/notificationService";
import { sendReport } from "@/lib/reportService";

type Post = {
  id: string;
  uid: string;
  name: string;
  photoURL: string;
  text: string;
  createdAt: Timestamp;
  likes?: string[];
  imageURL?: string;
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

const storage = getStorage();

export default function FeedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentType[]>>({});
  const [commentTextMap, setCommentTextMap] = useState<Record<string, string>>({});
  const [following, setFollowing] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;

    const q = collection(db, "users", user.uid, "following");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => doc.id);
      setFollowing(list);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const uids = [...following, user.uid];
    const postsQuery =
      uids.length > 0
        ? query(collection(db, "posts"), where("uid", "in", uids), orderBy("createdAt", "desc"))
        : query(collection(db, "posts"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(list);
    });

    return () => unsubscribe();
  }, [user, following]);

  useEffect(() => {
    if (posts.length === 0) return;

    const unsubscribes = posts.map((post) => {
      const q = query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"));
      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CommentType));
        setCommentsMap((prev) => ({ ...prev, [post.id]: list }));
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [posts]);

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

  async function uploadImage(file: File, postId: string): Promise<string> {
    // Converte para WebP antes do upload
    let fileToUpload = file;
    if (!file.type.includes('webp')) {
      try {
        fileToUpload = await convertToWebP(file);
      } catch (e) {
        console.warn('Falha ao converter para WebP, enviando original:', e);
      }
    }
    const imageRef = ref(storage, `posts/${postId}/${fileToUpload.name}`);
    await uploadBytes(imageRef, fileToUpload);
    const url = await getDownloadURL(imageRef);
    return url;
  }

  async function handlePost() {
    if (!text.trim() && !imageFile) return;
    setUploading(true);
    try {
      // Cria o post sem imagem pra pegar o ID
      const docRef = await addDoc(collection(db, "posts"), {
        uid: user?.uid,
        name: user?.displayName || "",
        photoURL: user?.photoURL || "",
        text: text.trim(),
        createdAt: Timestamp.now(),
        likes: [],
        imageURL: "",
      });
      if (imageFile) {
        try {
          const url = await uploadImage(imageFile, docRef.id);
          await updateDoc(doc(db, "posts", docRef.id), { imageURL: url });
        } catch (error) {
          console.error("Erro ao fazer upload/atualizar imagem:", error);
        }
      }
      setText("");
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;
    await deleteDoc(doc(db, "posts", postId));
  }

  async function handleEdit(postId: string) {
    if (!editingText.trim()) return;
    await updateDoc(doc(db, "posts", postId), {
      text: editingText,
    });
    setEditingPostId(null);
    setEditingText("");
  }

  async function handleAddComment(postId: string) {
    const text = commentTextMap[postId];
    if (!text || !text.trim() || !user) return;

    // Busca o post para notificar o dono
    const postDoc = await getDoc(doc(db, "posts", postId));
    const post = postDoc.exists() ? postDoc.data() : null;
    await addDoc(collection(db, "posts", postId, "comments"), {
      uid: user.uid,
      name: user.displayName || "",
      photoURL: user.photoURL || "",
      text: text.trim(),
      createdAt: Timestamp.now(),
      likes: [],
    });
    // Notifica o dono do post (não notifica a si mesmo)
    if (post && post.uid !== user.uid) {
      await sendNotification({
        toUid: post.uid,
        fromUid: user.uid,
        fromName: user.displayName || "",
        fromPhotoURL: user.photoURL || "",
        type: "comment",
        text: `${user.displayName} comentou no seu post: \"${text.trim()}\"`,
        postId,
        createdAt: Timestamp.now(),
      });
    }

    setCommentTextMap((prev) => ({ ...prev, [postId]: "" }));
  }

  async function toggleLike(post: Post) {
    if (!user) return;
    const liked = post.likes?.includes(user.uid);
    const newLikes = liked
      ? post.likes?.filter((uid) => uid !== user.uid)
      : [...(post.likes || []), user.uid];
    await updateDoc(doc(db, "posts", post.id), {
      likes: newLikes,
    });
    // Notifica o dono do post apenas ao curtir (não ao descurtir)
    if (!liked && post.uid !== user.uid) {
      await sendNotification({
        toUid: post.uid,
        fromUid: user.uid,
        fromName: user.displayName || "",
        fromPhotoURL: user.photoURL || "",
        type: "like",
        text: `${user.displayName} curtiu seu post!`,
        postId: post.id,
        createdAt: Timestamp.now(),
      });
    }
  }

  async function toggleFollow(targetUid: string) {
    if (!user) return;
    const isFollowing = following.includes(targetUid);

    const ref = doc(db, "users", user.uid, "following", targetUid);
    if (isFollowing) {
      await deleteFollowDoc(ref);
    } else {
      await setDoc(ref, { followedAt: Timestamp.now() });
    }
  }

  async function toggleLikeComment(postId: string, comment: CommentType) {
    if (!user) return;

    const liked = comment.likes?.includes(user.uid);
    const newLikes = liked
      ? comment.likes?.filter((uid) => uid !== user.uid)
      : [...(comment.likes || []), user.uid];

    const commentRef = doc(db, "posts", postId, "comments", comment.id);
    await updateDoc(commentRef, { likes: newLikes });

    // Notifica o dono do comentário ao curtir (não ao descurtir e não notifica a si mesmo)
    if (!liked && comment.uid !== user.uid) {
      await sendNotification({
        toUid: comment.uid,
        fromUid: user.uid,
        fromName: user.displayName || "",
        fromPhotoURL: user.photoURL || "",
        type: "like",
        text: `${user.displayName} curtiu seu comentário: \"${comment.text.slice(0, 30)}${comment.text.length > 30 ? '...' : ''}\"`,
        postId,
        commentId: comment.id,
        createdAt: Timestamp.now(),
      });
    }
  }

  if (loading) return <p className="text-zinc-200">Carregando...</p>;
  if (!user) return null;

  return (
    <div className="flex justify-center w-full max-w-7xl mx-auto mt-8 px-2 md:px-6" id="teste">
      {/* Feed principal */}
      <div className="flex-1 max-w-2xl w-full" style={{ maxHeight: 'calc(100vh - 96px)' }}>
        {/* Formulário de novo post */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow flex flex-col gap-3">
          <div className="flex items-center gap-3 mb-2">
            <img src={user.photoURL || '/default-avatar.png'} alt="avatar" className="w-10 h-10 rounded-full border border-zinc-700" />
            <span className="text-zinc-100 font-semibold">{user.displayName}</span>
          </div>
          <div>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImageFile(e.target.files[0]);
                  setImagePreview(URL.createObjectURL(e.target.files[0]));
                } else {
                  setImageFile(null);
                  setImagePreview(null);
                }
              }}
              className="hidden"
            />

            <label
              htmlFor="fileInput"
              className="cursor-pointer inline-block bg-zinc-700 text-white px-4 py-2 rounded hover:bg-zinc-600"
            >
              Selecionar arquivo
            </label>

            {imageFile && (
              <p className="mt-2 text-sm text-zinc-300">
                Arquivo selecionado: {imageFile.name}
              </p>
            )}
          </div>
          {imagePreview && (
            <div className="relative mt-2">
              <img src={imagePreview} alt="Preview" className="max-h-48 rounded border border-zinc-700 object-contain mx-auto" />
              <button
                type="button"
                className="absolute top-2 right-2 bg-zinc-800 bg-opacity-80 rounded-full p-1 text-zinc-200 hover:text-red-400"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                aria-label="Remover imagem"
              >
                &times;
              </button>
            </div>
          )}
          <textarea
            placeholder="Escreva algo..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={handlePost}
            disabled={uploading || (!text.trim() && !imageFile)}
            className={`mt-2 px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors w-full ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {uploading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>

        {/* Lista de posts */}
        <div className="flex flex-col gap-8">
          {posts.map((post) => {
            const isOwner = post.uid === user.uid;
            const liked = post.likes?.includes(user.uid) ?? false;
            const comments = commentsMap[post.id] || [];
            const commentText = commentTextMap[post.id] || "";

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
                    className="rounded-full border border-zinc-700 cursor-pointer"
                    onClick={() => router.push(`/profile/${post.uid}`)}
                    alt={post.name}
                  />
                  <strong
                    className="text-zinc-100 cursor-pointer hover:underline"
                    onClick={() => router.push(`/profile/${post.uid}`)}
                  >
                    {post.name}
                  </strong>
                  {post.uid !== user.uid && (
                    <button
                      onClick={() => toggleFollow(post.uid)}
                      className={`ml-auto px-3 py-1 rounded text-sm font-semibold transition-colors ${following.includes(post.uid) ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    >
                      {following.includes(post.uid) ? "Unfollow" : "Follow"}
                    </button>
                  )}
                </div>
                {/* Imagem do post */}
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
                {/* Texto do post */}
                <div className="px-4 py-2">
                  <p className="text-zinc-200 whitespace-pre-line mb-2">{post.text}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => toggleLike(post)}
                      className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${liked ? 'bg-pink-700 text-white' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'}`}
                    >
                      {liked ? "💔 Descurtir" : "❤️ Curtir"} ({post.likes?.length || 0})
                    </button>
                    {isOwner && editingPostId !== post.id && (
                      <>
                        <button
                          onClick={() => {
                            setEditingPostId(post.id);
                            setEditingText(post.text);
                          }}
                          className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
                        >Editar</button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >Excluir</button>
                      </>
                    )}
                    {/* Botão de denúncia de post */}
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
                  </div>
                  {editingPostId === post.id && (
                    <div className="flex flex-col gap-2 mt-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(post.id)}
                          className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >Salvar</button>
                        <button
                          onClick={() => setEditingPostId(null)}
                          className="px-4 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold"
                        >Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Comentários */}
                <div className="px-4 pb-4">
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
                      onUpdate={async (id, newText) => {
                        const commentRef = doc(db, "posts", post.id, "comments", id);
                        await updateDoc(commentRef, { text: newText });
                      }}
                      onDelete={async (id) => {
                        const commentRef = doc(db, "posts", post.id, "comments", id);
                        await deleteDoc(commentRef);
                      }}
                      onLike={() => toggleLikeComment(post.id, comment)}
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
                          postId: post.id, // Adiciona o postId ao report de comentário
                        });
                        alert('Denúncia enviada!');
                      }}
                    />
                  ))}
                  <textarea
                    placeholder="Escreva um comentário..."
                    value={commentText}
                    onChange={(e) =>
                      setCommentTextMap((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    rows={2}
                    className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mt-2"
                  />
                  <button
                    onClick={() => handleAddComment(post.id)}
                    className="mt-2 px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >Comentar</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Sidebar à direita fixa */}
      <aside className="hidden lg:flex flex-col w-80 ml-8 gap-6 sticky top-[80px] h-fit self-start">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow flex flex-col items-center">
          <img src={user?.photoURL || '/default-avatar.png'} alt="avatar" className="w-16 h-16 rounded-full border-2 border-zinc-700 mb-2" />
          <span className="text-zinc-100 font-semibold text-lg">{user?.displayName}</span>
          <Link href={`/profile`} className="mt-2 text-blue-400 hover:underline text-sm">Ver perfil</Link>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow">
          <h3 className="text-zinc-200 font-bold mb-2 text-lg">Espaço reservado</h3>
          <p className="text-zinc-400 text-sm">Em breve Funcionalidade de sugestões de jogadores pode ser implementada aqui.</p>
        </div>
      </aside>

      {modalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" onClick={() => setModalImage(null)}>
          <img src={modalImage} alt="Imagem ampliada" className="max-h-[90vh] max-w-[90vw] rounded shadow-lg border-4 border-zinc-800" />
        </div>
      )}
    </div>
  );
}
