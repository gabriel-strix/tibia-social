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
  QueryDocumentSnapshot,
  DocumentData,
  getDocs,
  startAfter,
  limit,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import db from "@/lib/firestore";
import Comment from "@/components/Comment";
import Link from "next/link";
import { sendNotification } from "@/lib/notificationService";
import { sendReport } from "@/lib/reportService";
import InstagramVideo from "@/components/InstagramVideo";
import LikeAvatars from "@/components/LikeAvatars";
import { MdComment, MdCameraAlt } from "react-icons/md";
import RequireAuth from "@/components/RequireAuth";
import Spinner from "@/components/Spinner";
import dynamic from "next/dynamic";

const CameraModal = dynamic(() => import("@/components/CameraModal"), { ssr: false });

type Post = {
  id: string;
  uid: string;
  name: string;
  photoURL: string;
  text: string;
  createdAt: Timestamp;
  likes?: string[];
  imageURL?: string;
  videoURL?: string;
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
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentType[]>>({});
  const [commentTextMap, setCommentTextMap] = useState<Record<string, string>>({});
  const [following, setFollowing] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCommentsMap, setShowCommentsMap] = useState<Record<string, boolean>>({});
  const [showCamera, setShowCamera] = useState(false);

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

    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
      let list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Post));
      // Filtra posts de usuários que bloquearam o usuário logado
      const blockedBy: string[] = [];
      for (const post of list) {
        const userDoc = await getDoc(doc(db, "users", post.uid));
        const blockedUsers = userDoc.exists() ? userDoc.data().blockedUsers || [] : [];
        if (blockedUsers.includes(user.uid)) blockedBy.push(post.uid);
      }
      list = list.filter(post => !blockedBy.includes(post.uid));
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

  // Função para upload de imagem ou vídeo
  async function uploadMedia(file: File, postId: string): Promise<{ imageURL?: string; videoURL?: string }> {
    if (file.type.startsWith('image/')) {
      // Imagem: converter para WebP
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
      return { imageURL: url };
    } else if (file.type.startsWith('video/')) {
      // Vídeo: upload direto
      const videoRef = ref(storage, `posts/${postId}/${file.name}`);
      await uploadBytes(videoRef, file);
      const url = await getDownloadURL(videoRef);
      return { videoURL: url };
    }
    return {};
  }

  async function handlePost() {
    // Agora exige obrigatoriamente um arquivo de mídia
    if (!mediaFile) {
      alert("É obrigatório enviar uma imagem ou vídeo para publicar um post.");
      return;
    }
    setUploading(true);
    try {
      // Cria o post sem mídia pra pegar o ID
      const docRef = await addDoc(collection(db, "posts"), {
        uid: user?.uid,
        name: user?.displayName || "",
        photoURL: user?.photoURL || "",
        text: text.trim(),
        createdAt: Timestamp.now(),
        likes: [],
        imageURL: "",
        videoURL: "",
      });
      if (mediaFile) {
        try {
          const result = await uploadMedia(mediaFile, docRef.id);
          await updateDoc(doc(db, "posts", docRef.id), result);
        } catch (error) {
          console.error("Erro ao fazer upload/atualizar mídia:", error);
        }
      }
      setText("");
      setMediaFile(null);
      setMediaPreview(null);
    } catch (error) {
      console.error("Erro ao criar post:", error);
    }
    setUploading(false);
  }

  async function handleDelete(postId: string) {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;
    // Busca o post para pegar a URL da imagem/vídeo
    const postDoc = await getDoc(doc(db, "posts", postId));
    const post = postDoc.exists() ? postDoc.data() as Post : null;
    // Remove imagem do Storage se existir
    if (post && post.imageURL) {
      try {
        const storage = getStorage();
        const baseUrl = `https://firebasestorage.googleapis.com/v0/b/`;
        const storageBucket = storage.app.options.storageBucket;
        let filePath = '';
        if (storageBucket && post.imageURL.startsWith(baseUrl + storageBucket)) {
          const urlParts = post.imageURL.split(`/${storageBucket}/o/`);
          if (urlParts.length > 1) {
            filePath = decodeURIComponent(urlParts[1].split('?')[0]);
          }
        }
        if (filePath) {
          const imageRef = ref(storage, filePath);
          await import('firebase/storage').then(({ deleteObject }) => deleteObject(imageRef));
        }
      } catch (e) {
        console.warn('Erro ao remover imagem do Storage:', e);
      }
    }
    // Remove vídeo do Storage se existir
    if (post && post.videoURL) {
      try {
        const storage = getStorage();
        const baseUrl = `https://firebasestorage.googleapis.com/v0/b/`;
        const storageBucket = storage.app.options.storageBucket;
        let filePath = '';
        if (storageBucket && post.videoURL.startsWith(baseUrl + storageBucket)) {
          const urlParts = post.videoURL.split(`/${storageBucket}/o/`);
          if (urlParts.length > 1) {
            filePath = decodeURIComponent(urlParts[1].split('?')[0]);
          }
        }
        if (filePath) {
          const videoRef = ref(storage, filePath);
          await import('firebase/storage').then(({ deleteObject }) => deleteObject(videoRef));
        }
      } catch (e) {
        console.warn('Erro ao remover vídeo do Storage:', e);
      }
    }
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

  // Função para buscar posts paginados
  async function fetchPosts(initial = false) {
    if (!user) return;
    setLoadingMore(true);
    const uids = [...following, user.uid];
    let postsQuery;
    if (uids.length > 0) {
      postsQuery = query(
        collection(db, "posts"),
        where("uid", "in", uids),
        orderBy("createdAt", "desc"),
        ...(lastVisible && !initial ? [startAfter(lastVisible)] : []),
        limit(5)
      );
    } else {
      postsQuery = query(
        collection(db, "posts"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc"),
        ...(lastVisible && !initial ? [startAfter(lastVisible)] : []),
        limit(5)
      );
    }
    const snapshot = await getDocs(postsQuery);
    const newPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Post));
    if (initial) {
      setPosts(newPosts);
    } else {
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const post of newPosts) {
          if (!ids.has(post.id)) merged.push(post);
        }
        return merged;
      });
    }
    setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    setHasMore(snapshot.docs.length === 5);
    setLoadingMore(false);
  }

  // Carrega os primeiros posts e reseta ao mudar following/user
  useEffect(() => {
    setPosts([]);
    setLastVisible(null);
    setHasMore(true);
    if (user) fetchPosts(true);
    // eslint-disable-next-line
  }, [user, following]);

  // Infinite scroll: carrega mais posts ao chegar no fim
  useEffect(() => {
    function onScroll() {
      const bottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
      if (bottom && hasMore && !loadingMore) {
        fetchPosts();
      }
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasMore, loadingMore, user, following, lastVisible]);

  if (loading) return <Spinner />;
  if (!user) return null;

  return (
    <RequireAuth>
      <div className="flex justify-center w-full max-w-7xl mx-auto mt-8 px-2 md:px-6" id="teste">
        {/* Feed principal */}
        <div className="flex-1 max-w-2xl w-full" style={{ maxHeight: 'calc(100vh - 96px)' }}>
          {/* Formulário de novo post */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow flex flex-col gap-3 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Link href={`/profile`} className="group flex items-center gap-2 cursor-pointer">
                <img src={user.photoURL || '/default-avatar.png'} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-zinc-700 group-hover:border-blue-400 transition" onError={e => { e.currentTarget.src = '/default-avatar.png'; }} />
                <span className="text-zinc-100 font-semibold group-hover:text-blue-400 transition">{user.displayName}</span>
              </Link>
            </div>
            <div className="flex gap-2 mb-2">
              {/* Botão para selecionar arquivo da galeria */}
              <input
                id="fileInputGallery"
                type="file"
                accept="image/*,video/*"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (file.type.startsWith('video/')) {
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
                className="hidden"
              />
              <label
                htmlFor="fileInputGallery"
                className="cursor-pointer inline-block bg-zinc-700 text-white px-4 py-2 rounded hover:bg-zinc-600"
              >
                Selecionar arquivo
              </label>
              {/* Botão de câmera customizado */}
              <button
                type="button"
                className="inline-flex items-center justify-center bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-600 text-lg"
                title="Abrir câmera para foto ou vídeo"
                onClick={() => setShowCamera(true)}
              >
                <MdCameraAlt className="w-6 h-6" />
              </button>
            </div>
            {showCamera && (
              <CameraModal
                onClose={() => setShowCamera(false)}
                onCapture={(file) => {
                  setShowCamera(false);
                  setMediaFile(file);
                  setMediaPreview(URL.createObjectURL(file));
                }}
              />
            )}
            {mediaFile && (
              <p className="mt-2 text-sm text-zinc-300">
                Arquivo selecionado: {mediaFile.name}
              </p>
            )}
            {mediaPreview && (
              <div className="relative mt-2">
                {mediaFile?.type.startsWith('image/') ? (
                  <img src={mediaPreview} alt="Preview" className="max-h-48 rounded border border-zinc-700 object-contain mx-auto" />
                ) : (
                  <video src={mediaPreview} controls className="max-h-48 rounded border border-zinc-700 object-contain mx-auto" />
                )}
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-zinc-800 bg-opacity-80 rounded-full p-1 text-zinc-200 hover:text-red-400"
                  onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                  aria-label="Remover mídia"
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
              disabled={uploading || (!text.trim() && !mediaFile)}
              className={`mt-2 px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors w-full ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {uploading ? 'Publicando...' : 'Publicar'}
            </button>
          </div>

          {/* Lista de posts */}
          <div className="flex flex-col gap-10">
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
                    <Link href={`/profile/${post.uid}`} className="group flex items-center gap-2 cursor-pointer">
                      <img
                        src={post.photoURL}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full border border-zinc-700 object-cover group-hover:border-blue-400 transition"
                        alt={post.name}
                      />
                      <span className="text-zinc-100 font-semibold group-hover:text-blue-400 transition">{post.name}</span>
                    </Link>
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
                        onClick={() => setModalImage(post.imageURL || null)}
                      />
                    </>
                  )}
                  {post.videoURL && (
                    <InstagramVideo src={post.videoURL} />
                  )}
                  {/* Texto do post */}
                  <div className="px-4 py-2">
                    <p className="text-zinc-200 whitespace-pre-line mb-2">{post.text}</p>
                    <LikeAvatars uids={post.likes || []} currentUserUid={user.uid} />
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => toggleLike(post)}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-semibold transition-colors ${liked ? 'bg-pink-700 text-white' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'}`}
                      >
                        {liked ? "💔" : "❤️"}
                        <span>{post.likes?.length || 0}</span>
                      </button>
                      <button
                        onClick={() => setShowCommentsMap((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="flex items-center gap-1 px-3 py-1 rounded text-sm font-semibold bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                      >
                        <MdComment className="w-5 h-5" />
                        <span>{comments.length}</span>
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
                  {showCommentsMap[post.id] && (
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
                  )}
                </div>
              );
            })}
            {loadingMore && <p className="text-zinc-200 text-center py-4">Carregando mais posts...</p>}
            {!hasMore && <p className="text-zinc-400 text-center py-4">Você chegou ao fim do feed.</p>}
          </div>
        </div>
        {/* Sidebar à direita fixa */}
        <aside className="hidden lg:flex flex-col w-80 ml-8 gap-6 sticky top-[80px] h-fit self-start">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow flex flex-col items-center">
            <Link href="/profile" className="group flex flex-col items-center cursor-pointer">
              <img src={user?.photoURL || '/default-avatar.png'} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700 mb-2 group-hover:border-blue-400 transition" onError={e => { e.currentTarget.src = '/default-avatar.png'; }} />
              <span className="text-zinc-100 font-semibold text-lg group-hover:text-blue-400 transition">{user?.displayName}</span>
            </Link>
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
    </RequireAuth>
  );
}
