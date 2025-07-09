"use client";

import UserProfile from "@/components/UserProfile";
import { useParams } from "next/navigation";

export default function ProfilePage() {
  const params = useParams<{ uid?: string }>();
  const uid = params?.uid;
  if (!uid) return <p>Usuário não encontrado.</p>;
  return <UserProfile uid={uid} />;
}
