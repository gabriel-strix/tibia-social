"use client";

import { useEffect, useState } from "react";
import { doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import db from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  targetUid: string;
};

export default function FollowButton({ targetUid }: Props) {
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
    }
  }

  return (
    <button onClick={toggleFollow}>
      {isFollowing ? "Deixar de seguir" : "Seguir"}
    </button>
  );
}
