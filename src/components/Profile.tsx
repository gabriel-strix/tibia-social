"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import db from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Character, addCharacter, updateCharacter } from "@/lib/characterService";
import FollowersFollowing from "@/components/FollowersFollowing";
import { TIBIA_WORLDS } from "@/lib/tibiaWorlds";

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const [profile, setProfile] = useState<{ name: string; email: string; photoURL: string; characters?: Character[] } | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [characters, setCharacters] = useState<Character[]>(profile?.characters || []);
  const [showAddCharacterForm, setShowAddCharacterForm] = useState(false);
  const [newCharacter, setNewCharacter] = useState<Character>({
    name: "",
    level: 1,
    vocation: "",
    world: "",
    type: "main"
  });
  const [editingCharacterIdx, setEditingCharacterIdx] = useState<number | null>(null);
  const [editCharacter, setEditCharacter] = useState<Character | null>(null);

  useEffect(() => {
    console.log("useEffect do Profile.tsx executado");

    // TESTE: Listar todos os chats do Firestore
    async function testChats() {
      console.log("Iniciando teste de leitura da coleção chats...");
      try {
        const snapshot = await getDocs(collection(db, "chats"));
        console.log("TESTE: chats encontrados:", snapshot.docs.length);
        snapshot.docs.forEach(doc => console.log("chatId:", doc.id));
      } catch (e) {
        console.error("Erro ao buscar chats:", e);
      }
    }
    testChats();

    if (!user) return;

    async function fetchProfile() {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data as any);
        setEditName(data?.name || "");
        setCharacters(data?.characters || []);
      }
    }

    fetchProfile();
  }, [user]);

  if (loading) return <p>Carregando...</p>;
  if (!user) return <p>Você precisa estar logado.</p>;
  if (!profile) return <p>Carregando perfil...</p>;

  async function handleSave() {
    setSaving(true);
    const docRef = doc(db, "users", user.uid);
    await updateDoc(docRef, { name: editName });
    setProfile((prev) => (prev ? { ...prev, name: editName } : null));
    setSaving(false);
  }

  async function handleAddCharacter(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await addCharacter(user.uid, newCharacter);
    setCharacters((prev) => [...prev, newCharacter]);
    setShowAddCharacterForm(false);
    setNewCharacter({ name: "", level: 1, vocation: "", world: "", type: "main" });
  }

  async function handleEditCharacter(idx: number) {
    setEditingCharacterIdx(idx);
    setEditCharacter({ ...characters[idx] });
  }

  async function handleSaveEditCharacter() {
    if (editCharacter && user) {
      await updateCharacter(user.uid, characters[editingCharacterIdx!].name, editCharacter);
      setCharacters((prev) =>
        prev.map((char, idx) =>
          idx === editingCharacterIdx ? { ...editCharacter } : char
        )
      );
      setEditingCharacterIdx(null);
      setEditCharacter(null);
    }
  }

  function handleCancelEditCharacter() {
    setEditingCharacterIdx(null);
    setEditCharacter(null);
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-zinc-900 rounded-lg shadow-lg text-zinc-100 mt-8">
      <h1 className="text-2xl font-bold mb-4 text-zinc-100">Perfil do usuário</h1>
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
        onClick={() => logout()}
        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold shadow transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
