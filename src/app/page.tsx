"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading, login, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/feed");
    }
  }, [user, loading, router]);

  if (loading) return <p className="text-zinc-200">Carregando...</p>;

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-zinc-900 rounded-lg shadow-lg max-w-md mx-auto mt-16">
        <Image
          src="/logo.png"
          alt="Tibia Social Logo"
          width={128}
          height={40}
          className="w-32 h-auto mb-4"
          priority
        />
        <h1 className="text-2xl font-bold mb-6 text-zinc-100">Acesse ou Cadastre-se:</h1>
        <button
          onClick={() => login()}
          className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow transition-colors"
        >
          Entrar com Google
        </button>
      </div>
    );
  }

  // Usuário logado será redirecionado para /feed
  return null;
}
