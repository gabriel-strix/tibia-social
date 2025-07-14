import React, { useState } from "react";
// import { fetchTibiaCharacterInfo } from "@/lib/tibiaScraper";
import { CharacterType, Character } from "./Profile";
import { TIBIA_WORLDS } from "@/lib/tibiaWorlds";

interface CharacterFormProps {
  initial?: Character;
  initialData?: Character; // alias para compatibilidade
  onSave: (char: Character) => void;
  onCancel: () => void;
  mode?: "add" | "edit";
}

export default function CharacterForm({ initial, initialData, onSave, onCancel, mode = "add" }: CharacterFormProps) {
  const [char, setChar] = useState<Character>(
    initialData || initial || { name: "", level: 1, vocation: "", world: "", type: "main" }
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tibia-character?name=${encodeURIComponent(char.name)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Personagem não encontrado no Tibia.com ou nome incorreto.");
      }
      const data = await res.json();
      setChar((prev) => ({ ...prev, level: data.level, vocation: data.vocation, world: data.world }));
      setSearched(true);
    } catch (e: any) {
      setChar((prev) => ({ ...prev, level: 0, vocation: '', world: '' }));
      setError(e.message || "Personagem não encontrado no Tibia.com ou nome incorreto.");
      setSearched(false);
    } finally {
      setLoading(false);
    }
  };

  const canSave = char.name && char.level > 0 && char.vocation && char.world;

  return (
    <div className="flex flex-col gap-3">
      {/* Etapa 1: Buscar personagem */}
      {(!searched && mode === "add") ? (
        <>
          <input
            type="text"
            placeholder="Nome do personagem"
            value={char.name}
            onChange={e => { setChar({ ...char, name: e.target.value }); setError(null); }}
            required
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
            disabled={loading}
          />
          <button
            type="button"
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={char.name.length < 3 || loading}
            onClick={handleSearch}
          >
            {loading ? "Buscando..." : "Buscar personagem"}
          </button>
          {error && <span className="text-red-400 text-sm">{error}</span>}
          <button
            type="button"
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-800 text-white font-semibold transition-colors"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </>
      ) : (
        <form
          onSubmit={e => { e.preventDefault(); if (canSave) onSave(char); }}
          className="flex flex-col gap-3"
        >
          <input
            type="text"
            value={char.name}
            disabled
            readOnly
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 opacity-60 cursor-not-allowed"
          />
          <input
            type="number"
            value={char.level}
            disabled
            readOnly
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 opacity-60 cursor-not-allowed"
          />
          <input
            type="text"
            value={char.vocation}
            disabled
            readOnly
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 opacity-60 cursor-not-allowed"
          />
          <input
            type="text"
            value={char.world}
            disabled
            readOnly
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 opacity-60 cursor-not-allowed"
          />
          <select
            value={char.type}
            onChange={e => setChar({ ...char, type: e.target.value as CharacterType })}
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100"
          >
            <option value="main">Principal</option>
            <option value="maker">Maker</option>
          </select>
          <button
            type="submit"
            className="mt-2 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
            disabled={!canSave}
          >
            Salvar personagem
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-800 text-white font-semibold transition-colors"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
