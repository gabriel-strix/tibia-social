"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import UserSearchBar from "@/components/UserSearchBar";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { listenUnreadMessages } from "@/lib/chatUnreadService";
import { listenUnreadNotifications } from "@/lib/notificationUnreadService";
import { MdHome, MdChat, MdExplore, MdNotifications, MdSettings, MdMenu, MdClose, MdSearch } from "react-icons/md";
const VerifiedBadge = React.lazy(() => import("@/components/VerifiedBadge"));

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

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
    router.push(`/profile/${u.username || u.uid}`);
  }

  // Não exibe a navbar na tela de login ou se não estiver logado
  if (pathname === "/login" || !user) return null;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-zinc-900 border-b border-zinc-800 h-[80px] flex items-center px-4 md:px-8 justify-between shadow-sm">
      {/* Logo à esquerda */}
      <div className="flex items-center gap-2">
        <Link href="/feed" className="flex items-center gap-2 select-none">
          <Image
            src="/logo.png"
            alt="TibiaSocial Logo"
            width={110}
            height={40}
            style={{ width: 110, height: 'auto', maxHeight: 120 }}
            priority
          />
        </Link>
      </div>
      {/* Menu mobile hamburguer */}
      <div className="flex md:hidden">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded hover:bg-zinc-800 focus:outline-none">
          <MdMenu className="w-8 h-8 text-zinc-200" />
        </button>
      </div>
      {/* Navegação centralizada com ícones (desktop) */}
      <div className="hidden md:flex gap-6 items-center">
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
      {/* Perfil à direita (desktop) */}
      <div className="hidden md:flex items-center gap-4">
        {user ? (
          <>
            <Link href={`/profile`} className="flex items-center gap-2 group">
              <Image
                src={user.photoURL || '/default-avatar.png'}
                alt="avatar"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border-2 border-zinc-700 group-hover:border-blue-400 transition"
                onError={(e: any) => { e.currentTarget.src = '/default-avatar.png'; }}
                priority={false}
                unoptimized
              />
              <span className="hidden md:inline text-zinc-200 font-semibold group-hover:text-blue-400 transition flex items-center">
                {user.displayName || 'Perfil'}
                {user.verified && (
                  <Suspense fallback={null}>
                    <VerifiedBadge />
                  </Suspense>
                )}
              </span>
            </Link>
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
      {/* Menu mobile lateral */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex">
          <div className="w-64 bg-zinc-900 h-full shadow-lg flex flex-col p-6 gap-6 relative animate-slideInLeft">
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 p-2 rounded hover:bg-zinc-800">
              <MdClose className="w-7 h-7 text-zinc-400" />
            </button>
            <Link href="/feed" className="flex items-center gap-3 text-zinc-200 hover:text-blue-400 text-lg" onClick={() => setMobileMenuOpen(false)}><MdHome /> Feed</Link>
            <Link href="/chat" className="flex items-center gap-3 text-zinc-200 hover:text-blue-400 text-lg" onClick={() => setMobileMenuOpen(false)}><MdChat /> Mensagens</Link>
            <Link href="/explore" className="flex items-center gap-3 text-zinc-200 hover:text-blue-400 text-lg" onClick={() => setMobileMenuOpen(false)}><MdExplore /> Explorar</Link>
            <Link href="/notifications" className="flex items-center gap-3 text-zinc-200 hover:text-blue-400 text-lg" onClick={() => setMobileMenuOpen(false)}><MdNotifications /> Notificações</Link>
            <Link href="/profile" className="flex items-center gap-3 text-zinc-200 hover:text-blue-400 text-lg" onClick={() => setMobileMenuOpen(false)}>
              <Image
                src={user?.photoURL || '/default-avatar.png'}
                alt="avatar"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border-2 border-zinc-700"
                onError={(e: any) => { e.currentTarget.src = '/default-avatar.png'; }}
                priority={false}
                unoptimized
              /> Perfil
            </Link>
            <button onClick={() => { setMobileMenuOpen(false); router.push('/settings'); }} className="flex items-center gap-3 text-zinc-200 hover:text-blue-400 text-lg"><MdSettings /> Configurações</button>
            {user?.isAdmin && (
              <Link href="/admin" className="flex items-center gap-3 text-yellow-400 hover:text-yellow-500 text-lg" onClick={() => setMobileMenuOpen(false)}>
                Painel Admin
              </Link>
            )}
            <button onClick={logout} className="flex items-center gap-3 text-red-400 hover:text-red-600 text-lg mt-4"><MdClose /> Sair</button>
            <button onClick={() => setShowMobileSearch(true)} className="flex items-center gap-3 text-zinc-200 hover:text-blue-400 text-lg">
              <MdSearch /> Pesquisar jogadores
            </button>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
      {/* Modal de pesquisa mobile */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md shadow-lg relative flex flex-col items-center">
            <button onClick={() => setShowMobileSearch(false)} className="absolute top-3 right-3 p-2 rounded-full hover:bg-zinc-800 z-10">
              <MdClose className="w-7 h-7 text-zinc-400" />
            </button>
            <div className="w-full mt-8">
              <UserSearchBar onSelect={u => { setShowMobileSearch(false); router.push(`/profile/${u.username || u.uid}`); }} />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// Para evitar sobreposição, adicione padding-top no layout global (provavelmente em layout.tsx):
// <body className="bg-zinc-950 min-h-screen pt-[72px]"> // 72px = altura da navbar
