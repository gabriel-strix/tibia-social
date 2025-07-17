import React, { useEffect, useState, Suspense } from "react";
const VerifiedBadge = React.lazy(() => import("@/components/VerifiedBadge"));
import { useAuth } from "@/hooks/useAuth";
import db from "@/lib/firestore";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

export interface Story {
  id: string;
  uid: string;
  username: string;
  photoURL: string;
  mediaURL: string;
  type: "image" | "video";
  createdAt: any;
}

export default function StoriesBar({ onSelectStory, onAddStory }: { onSelectStory: (stories: Story[]) => void, onAddStory?: () => void }) {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    // Busca stories dos últimos 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, "stories"),
      where("createdAt", ">", since),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, async (snap) => {
      const arr: Story[] = await Promise.all(
        snap.docs.map(async docSnap => {
          const data = docSnap.data();
          let verified = false;
          try {
            const userSnap = await import("firebase/firestore").then(fb => fb.getDoc(fb.doc(db, "users", data.uid)));
            if (userSnap.exists()) verified = userSnap.data().verified || false;
          } catch {}
          return {
            id: docSnap.id,
            uid: data.uid,
            username: data.username,
            photoURL: data.photoURL,
            mediaURL: data.mediaURL,
            type: data.type,
            createdAt: data.createdAt,
            verified
          } as Story;
        })
      );
      setStories(arr);
    });
    return () => unsub();
  }, []);

  // Agrupa stories por usuário
  const usersWithStories = Array.from(
    stories.reduce((map, story) => {
      if (!map.has(story.uid)) map.set(story.uid, { ...story, stories: [] });
      map.get(story.uid).stories.push(story);
      return map;
    }, new Map())
    .values()
  );

  return (
    <div className="flex gap-4 px-4 py-3 bg-zinc-950 overflow-x-auto">
      {/* Botão para adicionar story sempre em primeiro */}
      {user && (
        <button className="flex flex-col items-center group" onClick={onAddStory}>
          <div className="w-14 h-14 rounded-full border-2 border-green-500 flex items-center justify-center bg-zinc-900 group-hover:ring-2 group-hover:ring-green-400 transition">
            <span className="text-2xl text-green-400 font-bold">+</span>
          </div>
          <span className="mt-1 text-xs text-green-400 font-semibold">Seu story</span>
        </button>
      )}
      {usersWithStories.map(userStory => (
        <button
          key={userStory.uid}
          className="flex flex-col items-center group"
          onClick={() => onSelectStory(userStory.stories)}
        >
          <div className="w-14 h-14 rounded-full border-2 border-blue-500 group-hover:ring-2 group-hover:ring-blue-400 transition overflow-hidden flex items-center justify-center">
            <img
              src={userStory.photoURL || '/default-avatar.png'}
              alt={userStory.username}
              className="w-full h-full object-cover aspect-square"
            />
          </div>
          <span className="mt-1 text-xs text-zinc-100 group-hover:text-blue-400 font-semibold truncate max-w-[56px] flex items-center">
            {userStory.username}
          </span>
        </button>
      ))}
    </div>
  );
}
