"use client";

import React, { useState, Suspense } from "react";
const VerifiedBadge = React.lazy(() => import("@/components/VerifiedBadge"));
import { useRouter } from "next/navigation";
import { MdFavorite } from "react-icons/md";

type CommentProps = {
  id: string;
  uid: string;
  name: string;
  photoURL: string;
  text: string;
  likes?: string[];
  currentUserUid: string | undefined;
  onUpdate: (id: string, newText: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLike: () => void;
  onReport?: (reason: string) => void;
  username?: string;
  verified?: boolean;
};

export default function Comment({
  id,
  uid,
  name,
  photoURL,
  text,
  likes = [],
  currentUserUid,
  onUpdate,
  onDelete,
  onLike,
  onReport,
  username,
  verified
}: CommentProps) {
  const router = useRouter();
  const isOwner = uid === currentUserUid;
  const liked = likes.includes(currentUserUid || "");

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  async function saveEdit() {
    await onUpdate(id, editText);
    setEditing(false);
  }

  return (
    <div className="mb-3 border-b border-zinc-800 pb-3 px-2 bg-zinc-900 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <a
          href={username ? `/profile/${username}` : `/profile/${uid}`}
          className="group"
        >
          <img
            src={photoURL}
            alt={name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover border border-zinc-700 cursor-pointer transition duration-150 group-hover:ring-2 group-hover:ring-blue-500"
          />
        </a>
        <a
          href={username ? `/profile/${username}` : `/profile/${uid}`}
          className="ml-2 text-zinc-100 cursor-pointer font-semibold transition-colors duration-150 group hover:text-blue-400 hover:underline flex items-center"
        >
          <strong>{name}</strong>
          {verified && (
            <span className="ml-1 align-middle inline-flex"><VerifiedBadge /></span>
          )}
        </a>

        {onReport && !isOwner && (
          <button
            onClick={() => {
              const reason = prompt('Descreva o motivo da denúncia:');
              if (reason) onReport(reason);
            }}
            className="ml-auto px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-semibold"
          >Denunciar</button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 mt-1">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >Salvar</button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold"
            >Cancelar</button>
          </div>
        </div>
      ) : (
        <p className="text-zinc-200 ml-1 mt-1 whitespace-pre-line">
          {text.split(/(@[\w]+)/g).map((part, i) => {
            if (/^@[\w]+$/.test(part)) {
              const username = part.slice(1);
              return (
                <a
                  key={i}
                  href={`/profile/${username}`}
                  className="text-blue-400 hover:underline font-semibold"
                >{part}</a>
              );
            }
            return part;
          })}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2 ml-1">
        <button
          onClick={onLike}
          className={`flex items-center justify-center w-10 h-10 rounded-full text-xl transition-colors ${liked ? 'bg-pink-700 text-white' : 'bg-zinc-700 text-pink-500 hover:bg-zinc-600'}`}
          title={liked ? 'Descurtir' : 'Curtir'}
        >
          <MdFavorite className={liked ? "text-white" : "text-pink-500"} />
        </button>

        {isOwner && !editing && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
            >Editar</button>
            <button
              onClick={() => onDelete(id)}
              className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
            >Excluir</button>
          </>
        )}
      </div>
    </div>
  );
}