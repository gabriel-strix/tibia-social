import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import LikeAvatars from "@/components/LikeAvatars";
import InstagramVideo from "@/components/InstagramVideo";
const VerifiedBadge = React.lazy(() => import("@/components/VerifiedBadge"));
import { MdFavorite } from "react-icons/md";

export default function FeedPost({
  post,
  authorUsername,
  user,
  liked,
  isOwner,
  onLike,
  onEdit,
  onDelete,
  onReport,
  editingPost,
  editingText,
  setEditingText,
  handleEditPost,
  setEditingPost,
  setModalImage
}: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow p-0 flex flex-col">
      {/* Header do post */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href={`/profile/${authorUsername || post.uid}`} className="group flex items-center gap-2 cursor-pointer">
          <Image
            src={post.photoURL || '/default-avatar.png'}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full border border-zinc-700 object-cover group-hover:border-blue-400 transition"
            alt={post.name}
            unoptimized
            onError={(e: any) => { e.currentTarget.src = '/default-avatar.png'; }}
            priority={false}
          />
          <span className="text-zinc-100 font-semibold group-hover:text-blue-400 transition flex items-center">
            {post.name}
            {(post.verified || user?.verified) && (
              <Suspense fallback={null}>
                <VerifiedBadge />
              </Suspense>
            )}
          </span>
          <span className="ml-auto text-xs text-zinc-400">
            {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
          </span>
        </Link>
      </div>
      {/* Imagem do post */}
      {post.imageURL && (
        <img
          src={post.imageURL}
          alt="Imagem do post"
          className="w-full max-h-[400px] object-contain bg-zinc-800 border-b border-zinc-800 cursor-pointer transition hover:brightness-75 mx-auto"
          style={{ display: 'block', background: '#18181b' }}
          onClick={() => setModalImage(post.imageURL)}
        />
      )}
      {post.videoURL && (
        <InstagramVideo src={post.videoURL} />
      )}
      {/* Texto do post */}
      <div className="px-4 py-2">
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
        <LikeAvatars uids={post.likes || []} currentUserUid={user.uid} />
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={onLike}
            className={`flex items-center justify-center w-10 h-10 rounded-full text-xl transition-colors ${liked ? 'bg-pink-700 text-white' : 'bg-zinc-700 text-pink-500 hover:bg-zinc-600'}`}
            title={liked ? 'Descurtir' : 'Curtir'}
          >
            <MdFavorite className={liked ? "text-white" : "text-pink-500"} />
          </button>
          {isOwner && !editingPost && (
            <>
              <button
                onClick={onEdit}
                className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
              >Editar</button>
              <button
                onClick={onDelete}
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
              >Excluir</button>
            </>
          )}
          {!isOwner && post.uid !== user.uid && (
            <button
              onClick={onReport}
              className="px-3 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-semibold text-xs"
            >Denunciar</button>
          )}
        </div>
      </div>
    </div>
  );
}
