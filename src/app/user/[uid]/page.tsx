// src/app/user/[uid]/page.tsx
"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function RemovedUserFeedPage() {
  const params = useParams();
  const uid = params?.uid ? String(params.uid) : "";

  useEffect(() => {
    if (typeof window !== "undefined" && uid) {
      window.location.replace("/profile/" + uid);
    }
  }, [uid]);

  return null;
}
