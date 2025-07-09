import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import db from "@/lib/firestore";

export default function UserSearchBar({ onSelect }: { onSelect: (user: any) => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    const usersRef = collection(db, "users");
    // Busca por nome do usuário
    const q1 = query(usersRef, where("name", ">=", search), where("name", "<=", search + "\uf8ff"));
    const snap1 = await getDocs(q1);
    let users = snap1.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    // Busca por nome de personagem
    const allUsersSnap = await getDocs(usersRef);
    const charMatches = allUsersSnap.docs.filter(doc => {
      const chars = doc.data().characters || [];
      return chars.some((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
    });
    charMatches.forEach(doc => {
      if (!users.some(u => u.uid === doc.id)) {
        users.push({ uid: doc.id, ...doc.data() });
      }
    });
    setResults(users);
    setShowDropdown(true);
    setLoading(false);
  }

  function handleSelect(user: any) {
    setShowDropdown(false);
    setSearch("");
    setResults([]);
    onSelect(user);
  }

  return (
    <div className="relative w-48 md:w-70">
      <form onSubmit={handleSearch} className="flex">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="usuário ou personagem"
          className="px-3 py-1 rounded-l bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
        />
        <button type="submit" className="px-3 py-1 rounded-r bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          {loading ? "..." : "Buscar"}
        </button>
      </form>
      {showDropdown && results.length > 0 && (
        <ul className="absolute left-0 right-0 bg-zinc-900 border border-zinc-700 rounded mt-1 z-50 max-h-60 overflow-y-auto">
          {results.map(user => (
            <li
              key={user.uid}
              className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 cursor-pointer"
              onClick={() => handleSelect(user)}
            >
              <img src={user.photoURL || "/default-avatar.png"} alt={user.name} className="w-6 h-6 rounded-full border border-zinc-700" />
              <span className="text-zinc-100">{user.name}</span>
            </li>
          ))}
        </ul>
      )}
      {showDropdown && !loading && results.length === 0 && (
        <div className="absolute left-0 right-0 bg-zinc-900 border border-zinc-700 rounded mt-1 z-50 px-3 py-2 text-zinc-400">
          Nenhum usuário encontrado.
        </div>
      )}
    </div>
  );
}
