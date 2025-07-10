"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user && !loading) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) return <div className="text-zinc-200 p-8 text-center">Carregando...</div>;
  if (!user) return <div className="text-zinc-200 p-8 text-center">Redirecionando para login...</div>;
  return <>{children}</>;
}
