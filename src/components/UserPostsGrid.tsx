"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import db from "@/lib/firestore";
import InstagramVideo from "@/components/InstagramVideo";
import LikeAvatars from "@/components/LikeAvatars";

interface Post {
  id: string;
  uid: string;
  imageURL?: string;
  videoURL?: string;
  likes?: string[];
}

export default function UserPostsGrid({ uid }: { uid: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      const q = query(collection(db, "posts"), where("uid", "==", uid), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
      setLoading(false);
    }
    fetchPosts();
  }, [uid]);

  if (loading) return <div className="text-zinc-400 text-center">Carregando posts...</div>;
  if (posts.length === 0) return <div className="text-zinc-400 text-center">Nenhum post encontrado.</div>;

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4 mt-8">
      {posts.map(post => (
        <div
          key={post.id}
          className="relative group aspect-square bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
        >
          <a
            href={`/post/${post.id}`}
            className="absolute inset-0 z-10"
            tabIndex={-1}
            aria-label="Ver post"
          />
          {post.imageURL && (
            <img src={post.imageURL} alt="Post" className="w-full h-full object-cover group-hover:brightness-75 transition" />
          )}
          {post.videoURL && (
            <InstagramVideo src={post.videoURL} />
          )}
          <div className="absolute bottom-2 left-2 right-2 flex flex-col items-start gap-1 opacity-0 group-hover:opacity-100 transition z-20">
            <LikeAvatars uids={post.likes || []} currentUserUid={uid} />
          </div>
        </div>
      ))}
    </div>
  );
}
