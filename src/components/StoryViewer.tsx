import React, { useEffect, useState } from "react";

interface Story {
  id: string;
  uid: string;
  username: string;
  photoURL: string;
  mediaURL: string;
  type: "image" | "video";
  createdAt: any;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

export default function StoryViewer({ stories, initialIndex = 0, onClose }: StoryViewerProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const duration = 5000; // 5s por story

  useEffect(() => {
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (current < stories.length - 1) {
            setCurrent(current + 1);
            return 0;
          } else {
            setTimeout(onClose, 0);
            return 100;
          }
        }
        return p + 2;
      });
    }, duration / 50);
    return () => clearInterval(timer);
  }, [current, stories.length, onClose]);

  const story = stories[current];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="relative w-full max-w-md flex flex-col items-center">
        <div className="flex items-center gap-2 w-full px-4 pt-4">
          <img src={story.photoURL || '/default-avatar.png'} alt={story.username} className="w-10 h-10 rounded-full border border-blue-400" />
          <span className="text-zinc-100 font-semibold">{story.username}</span>
          <button onClick={onClose} className="ml-auto px-3 py-1 rounded bg-zinc-800 text-zinc-100 font-bold hover:bg-zinc-700">X</button>
        </div>
        <div className="flex gap-1 w-full px-4 mt-2">
          {stories.map((_, i) => (
            <div key={i} className="h-1 rounded bg-zinc-700 flex-1 overflow-hidden">
              <div
                className={`h-full ${i < current ? 'bg-blue-400' : i === current ? 'bg-blue-400' : ''}`}
                style={{ width: i === current ? `${progress}%` : i < current ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>
        <div className="w-full flex justify-center items-center mt-4">
          {story.type === "image" ? (
            <img src={story.mediaURL} alt="Story" className="max-h-[60vh] rounded shadow-lg" />
          ) : (
            <video src={story.mediaURL} controls autoPlay className="max-h-[60vh] rounded shadow-lg" />
          )}
        </div>
        <div className="flex justify-between w-full px-4 mt-4">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="px-3 py-1 rounded bg-zinc-800 text-zinc-100 font-bold hover:bg-zinc-700 disabled:opacity-50"
          >Anterior</button>
          <button
            onClick={() => setCurrent((c) => Math.min(stories.length - 1, c + 1))}
            disabled={current === stories.length - 1}
            className="px-3 py-1 rounded bg-zinc-800 text-zinc-100 font-bold hover:bg-zinc-700 disabled:opacity-50"
          >Próximo</button>
        </div>
      </div>
    </div>
  );
}
