import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import db from "@/lib/firestore";
import { MdSearch } from "react-icons/md";

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
    // Busca por username
    const qUsername = query(usersRef, where("username", ">=", search), where("username", "<=", search + "\uf8ff"));
    const snapUsername = await getDocs(qUsername);
    let users = snapUsername.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    // Busca por nome
    const q1 = query(usersRef, where("name", ">=", search), where("name", "<=", search + "\uf8ff"));
    const snap1 = await getDocs(q1);
    snap1.docs.forEach(doc => {
      if (!users.some(u => u.uid === doc.id)) {
        users.push({ uid: doc.id, ...doc.data() });
      }
    });
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
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSearch} className="flex items-center bg-zinc-800 rounded-lg border border-zinc-700 focus-within:ring-2 focus-within:ring-blue-500 px-2 py-1">
        <MdSearch className="w-5 h-5 text-zinc-400 mr-2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar usuário ou personagem..."
          className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-400 px-1 py-2"
        />
        <button type="submit" className="ml-2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold min-w-[70px]">
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
              <img src={user.photoURL || "/default-avatar.png"} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-zinc-700" onError={e => { e.currentTarget.src = '/default-avatar.png'; }} />
              <span className="text-zinc-100">{user.name}</span>
              <span className="text-zinc-400 text-xs ml-2">@{user.username}</span>
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
