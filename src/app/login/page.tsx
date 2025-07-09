"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/profile"); // redireciona se já logado
    }
  }, [user, loading]);

  if (loading) return <p className="text-zinc-200">Carregando...</p>;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-zinc-900 rounded-lg shadow-lg max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Entrar</h1>
      <button
        onClick={() => login().catch(console.error)}
        className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow transition-colors"
      >
        Entrar com Google
      </button>
    </div>
  );
}
