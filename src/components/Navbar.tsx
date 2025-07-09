"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import UserSearchBar from "@/components/UserSearchBar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listenUnreadMessages } from "@/lib/chatUnreadService";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = listenUnreadMessages(user.uid, setUnreadCount);
    return unsub;
  }, [user]);

  function handleUserSelect(u: any) {
    router.push(`/profile/${u.uid}`);
  }

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-zinc-900 border-b border-zinc-800 h-[80px] flex items-center px-4 md:px-8 justify-between shadow-sm">
      {/* Logo à esquerda */}
      <div className="flex items-center gap-2">
        <Link href="/feed" className="flex items-center gap-2 select-none">
          <img src="/logo.png" alt="TibiaSocial Logo" style={{ width: 110, height: 'auto', maxHeight: 120 }} />
        </Link>
      </div>
      {/* Navegação centralizada com ícones */}
      <div className="flex gap-6 items-center">
        <Link href="/feed" className="text-zinc-200 hover:text-blue-400 transition text-xl" title="Feed">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25V19.5A2.25 2.25 0 005.25 21.75h13.5A2.25 2.25 0 0021 19.5V8.25M3 8.25L12 3l9 5.25M3 8.25l9 5.25m0 0l9-5.25m-9 5.25v8.25" /></svg>
        </Link>
        {user && (
          <Link href="/chat" className="relative text-zinc-200 hover:text-blue-400 transition text-xl" title="Mensagens">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v7.5A2.25 2.25 0 0119.5 16.5h-7.818a.75.75 0 00-.53.22l-3.53 3.53a.75.75 0 01-1.28-.53V16.5A2.25 2.25 0 013 14.25v-7.5A2.25 2.25 0 015.25 4.5h14.25A2.25 2.25 0 0121.75 6.75z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center shadow">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )}
        <Link href="/explore" className="text-zinc-200 hover:text-blue-400 transition text-xl" title="Explorar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m8.25-9H21m-18 0h1.5m12.364-6.364l1.06 1.06m-12.728 0l1.06-1.06m12.728 12.728l-1.06-1.06m-12.728 0l-1.06 1.06" /></svg>
        </Link>
        <Link href="/notifications" className="text-zinc-200 hover:text-blue-400 transition text-xl" title="Notificações">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        </Link>
        <div className="hidden md:block">
          <UserSearchBar onSelect={handleUserSelect} />
        </div>
      </div>
      {/* Perfil à direita */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href={`/profile`} className="flex items-center gap-2 group">
              <img src={user.photoURL || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full border-2 border-zinc-700 group-hover:border-blue-400 transition" />
              <span className="hidden md:inline text-zinc-200 font-semibold group-hover:text-blue-400 transition">{user.displayName || 'Perfil'}</span>
            </Link>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition ml-2"
              title="Sair"
            >
              Sair
            </button>
          </>
        ) : (
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition ml-2">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

// Para evitar sobreposição, adicione padding-top no layout global (provavelmente em layout.tsx):
// <body className="bg-zinc-950 min-h-screen pt-[72px]"> // 72px = altura da navbar
