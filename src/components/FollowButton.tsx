"use client";

import { useEffect, useState } from "react";
import { doc, setDoc, deleteDoc, onSnapshot, Timestamp } from "firebase/firestore";
import db from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { sendNotification } from "@/lib/notificationService";

type Props = {
  targetUid: string;
  className?: string;
};

export default function FollowButton({ targetUid, className }: Props) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid, "following", targetUid);
    const unsub = onSnapshot(ref, (snap) => {
      setIsFollowing(snap.exists());
    });

    return () => unsub();
  }, [user, targetUid]);

  async function toggleFollow() {
    if (!user) return;
    const myFollowRef = doc(db, "users", user.uid, "following", targetUid);
    const theirFollowerRef = doc(db, "users", targetUid, "followers", user.uid);
    if (isFollowing) {
      await deleteDoc(myFollowRef);
      await deleteDoc(theirFollowerRef);
    } else {
      await setDoc(myFollowRef, { since: new Date() });
      await setDoc(theirFollowerRef, { since: new Date() });
      // Notifica o usuário seguido
      if (user.uid !== targetUid) {
        await sendNotification({
          toUid: targetUid,
          fromUid: user.uid,
          fromName: user.displayName || "",
          fromPhotoURL: user.photoURL || "",
          type: "follow",
          text: `${user.displayName} começou a seguir você!`,
          createdAt: Timestamp.now(),
        });
      }
    }
  }

  return (
    <button
      onClick={toggleFollow}
      className={className || (isFollowing
        ? "bg-zinc-700 text-white px-4 py-2 rounded font-semibold ml-2"
        : "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold ml-2")}
    >
      {isFollowing ? "Seguindo" : "Seguir"}
    </button>
  );
}
