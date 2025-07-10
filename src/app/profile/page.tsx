"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import UserProfile from "@/components/UserProfile";
import RequireAuth from "@/components/RequireAuth";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  if (loading) return <p>Carregando...</p>;
  if (!user) return null;

  return (
    <RequireAuth>
      <UserProfile uid={user.uid} />
    </RequireAuth>
  );
}
