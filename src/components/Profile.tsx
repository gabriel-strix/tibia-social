"use client";


import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import db from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import FollowersFollowing from "@/components/FollowersFollowing";
import { TIBIA_WORLDS } from "@/lib/tibiaWorlds";
import { useRouter } from "next/navigation";

export type CharacterType = "main" | "maker";

export interface Character {
  name: string;
  level: number;
  vocation: string;
  world: string;
  type: CharacterType;
}

export interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
  characters?: Character[];
}

interface EditCharacterState {
  idx: number | null;
  character: Character | null;
}


export default function Profile() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [characters, setCharacters] = useState<Array<Character>>(profile?.characters || []);
  const [showAddCharacterForm, setShowAddCharacterForm] = useState<boolean>(false);
  const [newCharacter, setNewCharacter] = useState<Character>({
    name: "",
    level: 1,
    vocation: "",
    world: "",
    type: "main"
  });
  const [editingCharacterIdx, setEditingCharacterIdx] = useState<number | null>(null);
  const [editCharacter, setEditCharacter] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          setEditName(data?.name || "");
          setCharacters(data?.characters || []);
        } else {
          setError("Perfil não encontrado.");
        }
      } catch (e) {
        setError("Erro ao carregar perfil. Tente novamente mais tarde.");
      }
    }

    fetchProfile();
  }, [user]);

  if (loading) return <p>Carregando...</p>;
  if (!user) return <p>Você precisa estar logado.</p>;
  if (!profile) return <p>Carregando perfil...</p>;
  
  if (error) {
    return <div className="bg-red-700 text-white p-4 rounded mb-4">{error}</div>;
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, { name: editName });
      setProfile((prev) => (prev ? { ...prev, name: editName } : null));
    } catch (e) {
      setError("Erro ao salvar o nome. Tente novamente mais tarde.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCharacter(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!user) return;
    try {
      await (await import("@/lib/characterService")).addCharacter(user.uid, newCharacter);
      setCharacters((prev: Character[]) => [...prev, newCharacter]);
      setShowAddCharacterForm(false);
      setNewCharacter({ name: "", level: 1, vocation: "", world: "", type: "main" });
    } catch (e) {
      setError("Erro ao adicionar personagem. Tente novamente mais tarde.");
    }
  }

  function handleEditCharacter(idx: number): void {
    setEditingCharacterIdx(idx);
    setEditCharacter({ ...characters[idx] });
  }

  async function handleSaveEditCharacter(): Promise<void> {
    setError(null);
    if (editCharacter && user && editingCharacterIdx !== null) {
      try {
        await (await import("@/lib/characterService")).updateCharacter(
          user.uid,
          characters[editingCharacterIdx].name,
          editCharacter
        );
        setCharacters((prev: Character[]) =>
          prev.map((char: Character, idx: number) =>
            idx === editingCharacterIdx ? { ...editCharacter } : char
          )
        );
        setEditingCharacterIdx(null);
        setEditCharacter(null);
      } catch (e) {
        setError("Erro ao salvar edição do personagem. Tente novamente mais tarde.");
      }
    }
  }

  function handleCancelEditCharacter(): void {
    setEditingCharacterIdx(null);
    setEditCharacter(null);
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-zinc-900 rounded-lg shadow-lg text-zinc-100 mt-8">
      {/* ...restante do JSX permanece igual... */}
      <h1 className="text-2xl font-bold mb-4 text-zinc-100 flex items-center gap-2">
        Perfil do usuário
        <button
          title="Configurações da conta"
          onClick={() => router.push('/settings')}
          className="ml-2 p-2 rounded-full hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {/* Heroicons Outline Cog */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-zinc-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 2.25c.414-1.036 1.836-1.036 2.25 0l.217.543a1.125 1.125 0 001.671.592l.497-.287c.966-.56 2.122.302 1.962 1.39l-.09.574a1.125 1.125 0 001.07 1.294l.564.047c1.073.09 1.516 1.426.741 2.143l-.415.38a1.125 1.125 0 000 1.662l.415.38c.775.717.332 2.053-.741 2.143l-.564.047a1.125 1.125 0 00-1.07 1.294l.09.574c.16 1.088-.996 1.95-1.962 1.39l-.497-.287a1.125 1.125 0 00-1.671.592l-.217.543c-.414 1.036-1.836 1.036-2.25 0l-.217-.543a1.125 1.125 0 00-1.671-.592l-.497.287c-.966.56-2.122-.302-1.962-1.39l.09-.574A1.125 1.125 0 005.25 12.75l-.564-.047c-1.073-.09-1.516-1.426-.741-2.143l.415-.38a1.125 1.125 0 000-1.662l-.415-.38c-.775-.717-.332-2.053.741-2.143l.564-.047A1.125 1.125 0 006.32 5.25l-.09-.574c-.16-1.088.996-1.95 1.962-1.39l.497.287a1.125 1.125 0 001.671-.592l.217-.543z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </h1>
      {/* ...restante do JSX permanece igual... */}
      {/* O restante do JSX já está correto e não precisa ser alterado */}
      <div className="flex items-center gap-4 mb-4">
        <img
          src={profile.photoURL}
          alt="Foto do usuário"
          width={100}
          height={100}
          className="rounded-full border-2 border-zinc-700 shadow"
          onError={e => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }}
        />
        <div>
          <p className="text-zinc-400 text-sm">Email:</p>
          <p className="text-zinc-100 font-semibold">{profile.email}</p>
        </div>
      </div>

      <form className="flex items-center gap-2 mb-6" onSubmit={e => { e.preventDefault(); handleSave(); }}>
        <label className="text-zinc-200 font-semibold">
          Nome:
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={saving}
            className="ml-2 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="ml-3 px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60 transition-colors"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>

      <hr className="my-6 border-zinc-700" />

      {/* Exibe seguidores e seguindo do próprio usuário */}
      <FollowersFollowing profileUid={user.uid} />

      <h2 className="text-xl font-bold mt-8 mb-3 text-zinc-100">Personagens</h2>
      <ul className="mb-4 space-y-2">
        {characters.map((char, idx) => (
          <li
            key={idx}
            className="bg-zinc-800 rounded p-3 flex flex-col md:flex-row md:items-center md:gap-2 text-zinc-100 shadow border border-zinc-700"
          >
            {editingCharacterIdx === idx && editCharacter ? (
              <form
                onSubmit={e => { e.preventDefault(); handleSaveEditCharacter(); }}
                className="flex flex-col md:flex-row md:items-center md:gap-2 w-full"
              >
                <input
                  type="text"
                  value={editCharacter.name}
                  onChange={e => setEditCharacter({ ...editCharacter, name: e.target.value })}
                  required
                  className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={editCharacter.level}
                  onChange={e => setEditCharacter({ ...editCharacter, level: Number(e.target.value) })}
                  min={1}
                  required
                  className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={editCharacter.vocation}
                  onChange={e => setEditCharacter({ ...editCharacter, vocation: e.target.value })}
                  required
                  className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a vocação</option>
                  <option value="Knight">Knight</option>
                  <option value="Elite Knight">Elite Knight</option>
                  <option value="Paladin">Paladin</option>
                  <option value="Royal Paladin">Royal Paladin</option>
                  <option value="Druid">Druid</option>
                  <option value="Elder Druid">Elder Druid</option>
                  <option value="Sorcerer">Sorcerer</option>
                  <option value="Master Sorcerer">Master Sorcerer</option>
                </select>
                <select
                  value={editCharacter.world}
                  onChange={e => setEditCharacter({ ...editCharacter, world: e.target.value })}
                  required
                  className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o mundo</option>
                  {TIBIA_WORLDS.map(world => (
                    <option key={world} value={world}>{world}</option>
                  ))}
                </select>
                <select
                  value={editCharacter.type}
                  onChange={e => setEditCharacter({ ...editCharacter, type: e.target.value as 'main' | 'maker' })}
                  className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="main">Principal</option>
                  <option value="maker">Maker</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold ml-2"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditCharacter}
                  className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-800 text-white font-semibold ml-2"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <b className="text-zinc-100">{char.name}</b>
                <span className="text-zinc-200 text-sm">Nível: {char.level}</span>
                <span className="text-zinc-200 text-sm">Vocação: {char.vocation}</span>
                <span className="text-zinc-200 text-sm">Mundo: {char.world}</span>
                <span className="text-zinc-200 text-sm">Tipo: {char.type === 'main' ? 'Principal' : 'Maker'}</span>
                {user && (
                  <button
                    onClick={() => handleEditCharacter(idx)}
                    className="ml-auto mt-2 md:mt-0 px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
                  >
                    Editar
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <button
        onClick={() => setShowAddCharacterForm((v) => !v)}
        className="mt-2 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors mb-2"
      >
        {showAddCharacterForm ? "Cancelar" : "Adicionar personagem"}
      </button>
      {showAddCharacterForm && (
        <form
          onSubmit={handleAddCharacter}
          className="flex flex-col gap-3 bg-zinc-800 p-4 rounded border border-zinc-700 mt-3"
        >
          <input
            type="text"
            placeholder="Nome"
            value={newCharacter.name}
            onChange={e => setNewCharacter({ ...newCharacter, name: e.target.value })}
            required
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Nível"
            value={newCharacter.level}
            onChange={e => setNewCharacter({ ...newCharacter, level: Number(e.target.value) })}
            min={1}
            required
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newCharacter.vocation}
            onChange={e => setNewCharacter({ ...newCharacter, vocation: e.target.value })}
            required
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione a vocação</option>
            <option value="Knight">Knight</option>
            <option value="Elite Knight">Elite Knight</option>
            <option value="Paladin">Paladin</option>
            <option value="Royal Paladin">Royal Paladin</option>
            <option value="Druid">Druid</option>
            <option value="Elder Druid">Elder Druid</option>
            <option value="Sorcerer">Sorcerer</option>
            <option value="Master Sorcerer">Master Sorcerer</option>
          </select>
          <select
            value={newCharacter.world}
            onChange={e => setNewCharacter({ ...newCharacter, world: e.target.value })}
            required
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione o mundo</option>
            {TIBIA_WORLDS.map(world => (
              <option key={world} value={world}>{world}</option>
            ))}
          </select>
          <select
            value={newCharacter.type}
            onChange={e => setNewCharacter({ ...newCharacter, type: e.target.value as "main" | "maker" })}
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="main">Principal</option>
            <option value="maker">Maker</option>
          </select>
          <button
            type="submit"
            className="mt-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Salvar personagem
          </button>
        </form>
      )}

      <hr className="my-6 border-zinc-700" />

      <button
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold shadow transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
