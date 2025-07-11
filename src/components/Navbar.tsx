"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import UserSearchBar from "@/components/UserSearchBar";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { listenUnreadMessages } from "@/lib/chatUnreadService";
import { listenUnreadNotifications } from "@/lib/notificationUnreadService";
import { MdHome, MdChat, MdExplore, MdNotifications, MdSettings } from "react-icons/md";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = listenUnreadMessages(user.uid, setUnreadCount);
    const unsubNotif = listenUnreadNotifications(user.uid, setUnreadNotifications);
    return () => {
      unsub();
      unsubNotif();
    };
  }, [user]);

  function handleUserSelect(u: any) {
    router.push(`/profile/${u.uid}`);
  }

  // Não exibe a navbar na tela de login ou se não estiver logado
  if (pathname === "/login" || !user) return null;

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
          <MdHome className="w-6 h-6" />
        </Link>
        {user && (
          <Link href="/chat" className="relative text-zinc-200 hover:text-blue-400 transition text-xl" title="Mensagens">
            <MdChat className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center shadow">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )}
        <Link href="/explore" className="text-zinc-200 hover:text-blue-400 transition text-xl" title="Explorar">
          <MdExplore className="w-6 h-6" />
        </Link>
        <Link href="/notifications" className="relative text-zinc-200 hover:text-blue-400 transition text-xl" title="Notificações">
          <MdNotifications className="w-6 h-6" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center shadow">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
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
            {/* Ícone de configurações */}
            <button
              title="Configurações da conta"
              onClick={() => router.push('/settings')}
              className="p-2 rounded-full hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <MdSettings className="w-6 h-6 text-zinc-400" />
            </button>
            {/* Botão admin */}
            {user.isAdmin && (
              <Link href="/admin" className="bg-yellow-500 hover:bg-yellow-600 text-zinc-900 font-bold px-4 py-2 rounded transition ml-2" title="Painel Admin">
                Painel Admin
              </Link>
            )}
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
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
