"use client";

import React from "react";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { user, loading, login, logout } = useAuth();

  if (loading) return <p className="text-zinc-200">Carregando...</p>;

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-zinc-900 rounded-lg shadow-lg max-w-md mx-auto mt-16">
        <h1 className="text-2xl font-bold mb-6 text-zinc-100">Login Tibia Social</h1>
        <button
          onClick={() => login()}
          className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow transition-colors"
        >
          Entrar com Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-zinc-900 rounded-lg shadow-lg max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Bem-vindo, {user.displayName}</h1>
      <button
        onClick={() => logout()}
        className="px-6 py-3 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-lg shadow transition-colors"
      >
        Sair
      </button>
    </div>
  );
}
