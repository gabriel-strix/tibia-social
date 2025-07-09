"use client";

import Link from "next/link";

// Página de explorar estilo Instagram
export default function ExplorePage() {
  // Exemplo de dados estáticos (substitua por busca real depois)
  const mockUsers = [
    { uid: "1", name: "Knightzera", photoURL: "/default-avatar.png" },
    { uid: "2", name: "SorcererX", photoURL: "/default-avatar.png" },
    { uid: "3", name: "Druidinha", photoURL: "/default-avatar.png" },
    { uid: "4", name: "Paladina", photoURL: "/default-avatar.png" },
    { uid: "5", name: "Maker123", photoURL: "/default-avatar.png" },
  ];

  return (
    <div className="flex justify-center w-full min-h-screen bg-zinc-950 pt-4">
      <div className="w-full max-w-4xl flex flex-col gap-8 mt-4">
        <h1 className="text-2xl font-bold mb-6 text-zinc-100 text-center">Explorar Jogadores</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {mockUsers.map((user) => (
            <Link
              key={user.uid}
              href={`/profile/${user.uid}`}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col items-center shadow hover:border-blue-400 transition"
            >
              <img src={user.photoURL} alt={user.name} className="w-20 h-20 rounded-full border-2 border-zinc-700 mb-2 object-cover" />
              <span className="text-zinc-100 font-semibold text-lg">{user.name}</span>
              <span className="text-zinc-400 text-xs mt-1">Ver perfil</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
