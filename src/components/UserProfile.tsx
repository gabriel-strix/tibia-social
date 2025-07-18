"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
const VerifiedBadge = React.lazy(() => import("@/components/VerifiedBadge"));
import { doc, getDoc, updateDoc } from "firebase/firestore";
import db from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Character, addCharacter, updateCharacter, deleteCharacter } from "@/lib/characterService";
import CharacterForm from "@/components/CharacterForm";
import FollowersFollowing from "@/components/FollowersFollowing";
import { TIBIA_WORLDS } from "@/lib/tibiaWorlds";
import UserPostsGrid from "@/components/UserPostsGrid";
import FollowButton from "@/components/FollowButton";

interface UserProfileProps {
  uid: string;
}

export default function UserProfile({ uid }: UserProfileProps) {
  const { user: currentUser, loading, logout } = useAuth();
  const isOwnProfile = currentUser?.uid === uid;
  const [profile, setProfile] = useState<{ name: string; email: string; photoURL: string; username?: string; characters?: Character[]; blockedUsers?: string[]; verified?: boolean } | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showAddCharacterForm, setShowAddCharacterForm] = useState(false);
  // newCharacter removido, CharacterForm será usado
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [editCharData, setEditCharData] = useState<Character | null>(null);

  useEffect(() => {
    if (!uid) return;
    async function fetchProfile() {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data as any);
        setEditName(data?.name || "");
        setCharacters(data?.characters || []);
      }
    }
    fetchProfile();
  }, [uid]);

  // useEffect removido, CharacterForm gerencia estado interno

  // Verifica se o usuário logado está bloqueado por este perfil
  const isBlocked = profile?.blockedUsers?.includes(currentUser?.uid);

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg p-8 mt-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-4">Usuário não encontrado</h1>
          <p className="text-zinc-400">Este perfil não está disponível.</p>
        </div>
      </div>
    );
  }

  if (loading) return <p>Carregando...</p>;
  if (!profile) return <p>Carregando perfil...</p>;

  async function handleSave() {
    setSaving(true);
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { name: editName });
    setProfile((prev) => (prev ? { ...prev, name: editName } : null));
    setSaving(false);
  }

  // handleAddCharacter removido, CharacterForm será usado

  async function handleEditCharacter(char: Character) {
    setEditingCharacter(char);
    setEditCharData({ ...char });
  }

  async function handleSaveEditCharacter(e: React.FormEvent) {
    e.preventDefault();
    if (!editCharData) return;
    await updateCharacter(uid, editingCharacter!.name, editCharData);
    setCharacters((prev) => prev.map(c => c.name === editingCharacter!.name ? editCharData : c));
    setEditingCharacter(null);
    setEditCharData(null);
  }

  async function handleDeleteCharacter(char: Character) {
    if (!confirm(`Deseja remover o personagem ${char.name}?`)) return;
    await deleteCharacter(uid, char.name);
    setCharacters((prev) => prev.filter(c => c.name !== char.name));
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-zinc-950 pt-4">
      {/* Header do perfil estilo Instagram */}
      <div className="w-full max-w-3xl flex flex-col md:flex-row items-center md:items-start gap-8 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg p-8 mt-8 mb-8">
        <Image
          src={profile.photoURL || '/default-avatar.png'}
          alt="Foto do usuário"
          width={128}
          height={128}
          className="w-32 h-32 rounded-full object-cover border-4 border-zinc-700"
          onError={(e: any) => { e.currentTarget.src = '/default-avatar.png'; }}
          priority
          unoptimized
        />
        <div className="flex-1 flex flex-col gap-4 w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <span className="flex items-center">
              <h1 className="text-2xl font-bold text-zinc-100">{profile.name}</h1>
              {profile.verified && (
                <Suspense fallback={null}>
                  <VerifiedBadge />
                </Suspense>
              )}
            </span>
            {isOwnProfile && (
              <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition font-semibold">Sair</button>
            )}
            {/* Botão "Ver feed deste usuário" removido */}
            {!isOwnProfile && (
              <>
                <button
                  onClick={() => window.location.href = `/chat/${profile?.username || uid}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition font-semibold"
                >
                  Enviar mensagem
                </button>
                <FollowButton targetUid={uid} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition font-semibold ml-2" />
                {/* Botão Bloquear usuário */}
                {currentUser?.blockedUsers?.includes(uid) ? (
                  <button
                    onClick={async () => {
                      const { unblockUserAndRestore } = await import("@/lib/userService");
                      await unblockUserAndRestore(currentUser.uid, uid);
                      alert('Usuário desbloqueado!');
                      window.location.reload();
                    }}
                    className="ml-2 px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-800 text-zinc-300 font-semibold"
                  >
                    Desbloquear usuário
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const { blockUserAndUnfollow } = await import("@/lib/userService");
                      await blockUserAndUnfollow(currentUser.uid, uid);
                      alert('Usuário bloqueado!');
                      window.location.reload();
                    }}
                    className="ml-2 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    Bloquear usuário
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex gap-8 text-zinc-200 text-lg">
            {/* Removido descritivo com número de personagens */}
          </div>
          <FollowersFollowing profileUid={uid} username={profile.username} />
        </div>
      </div>

      {/* Grid de personagens estilo Instagram */}
      <div className="w-full max-w-3xl">
        <h2 className="text-xl font-bold mb-4 text-zinc-100">Personagens</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[...characters].sort((a, b) => (a.type === "main" ? -1 : b.type === "main" ? 1 : 0)).map((char, idx) => (
            <div key={idx} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex flex-col items-center shadow">
              {editingCharacter?.name === char.name ? (
                <CharacterForm
                  mode="edit"
                  initialData={editCharData || undefined}
                  onSave={async (updatedChar) => {
                    await updateCharacter(uid, editingCharacter!.name, updatedChar);
                    setCharacters((prev) => prev.map(c => c.name === editingCharacter!.name ? updatedChar : c));
                    setEditingCharacter(null);
                    setEditCharData(null);
                  }}
                  onCancel={() => {
                    setEditingCharacter(null);
                    setEditCharData(null);
                  }}
                />
              ) : (
                <>
                  {/* Avatar do personagem otimizado */}
                  <Image
                    src={'/default-avatar.png'}
                    alt={`Avatar de ${char.name}`}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700 mb-2"
                  />
                  <b className="text-zinc-100 text-lg mb-1">{char.name}</b>
                  <span className="text-zinc-300 text-sm mb-2">Nível: {char.level}</span>
                  <span className="text-zinc-300 text-sm mb-2">Vocação: {char.vocation}</span>
                  <span className="text-zinc-300 text-sm mb-2">Mundo: {char.world}</span>
                  <span className="text-zinc-400 text-xs mb-2">{char.type === 'main' ? 'Principal' : 'Maker'}</span>
                  {isOwnProfile && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleEditCharacter(char)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm">Editar</button>
                      <button onClick={() => handleDeleteCharacter(char)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">Remover</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        {/* Formulário de adicionar personagem */}
        {isOwnProfile && (
          <div className="mt-8">
            <button onClick={() => setShowAddCharacterForm((v) => !v)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition font-semibold">
              {showAddCharacterForm ? "Cancelar" : "Adicionar personagem"}
            </button>
            {showAddCharacterForm && (
              <div className="mt-4 flex flex-wrap gap-2 items-center bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <CharacterForm
                  onSave={async (char) => {
                    // Permite apenas 1 personagem principal
                    if (char.type === "main" && characters.some(c => c.type === "main")) {
                      alert("Você só pode adicionar um personagem principal (main). Adicione apenas makers agora.");
                      return;
                    }
                    await addCharacter(uid, char);
                    setCharacters((prev) => [...prev, char]);
                    setShowAddCharacterForm(false);
                  }}
                  onCancel={() => setShowAddCharacterForm(false)}
                  mode="add"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid de posts estilo Instagram */}
      <div className="w-full max-w-3xl">
        <h2 className="text-xl font-bold mb-4 text-zinc-100">Posts</h2>
        <UserPostsGrid uid={uid} />
      </div>
    </div>
  );
}
