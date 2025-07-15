// Função utilitária para mostrar tempo relativo do story
function getTimeAgo(date: any): string {
  if (!date) return "";
  const now = Date.now();
  let ts = date;
  if (typeof date === "object" && date.seconds) ts = date.seconds * 1000;
  if (typeof date === "string") ts = new Date(date).getTime();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff/60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h atrás`;
  return `${Math.floor(diff/86400)}d atrás`;
}
import React, { useEffect, useState } from "react";
import "./story-animations.css";
import db from "@/lib/firestore";
import { doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

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
  const [animDirection, setAnimDirection] = useState<'left' | 'right' | null>(null);
  // Atualiza o índice se o array de stories mudar (ex: story excluído ou novo story publicado)
  useEffect(() => {
    if (current >= stories.length) {
      // Se não há mais stories, fecha o modal
      onClose();
    }
    // Se stories mudou, mas ainda existe o índice, mantém o índice
    // Se stories mudou e o índice é inválido, volta para o último
    if (stories.length > 0 && current < 0) {
      setCurrent(0);
    }
  }, [stories, current, onClose]);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [paused, setPaused] = useState(false);
  const duration = 5000; // 5s por story
  const { user } = useAuth();

  useEffect(() => {
    setProgress(0);
    if (paused) return;
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
  }, [current, stories.length, onClose, paused]);

  const story = stories[current];

  // Lógica de swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [mouseDownX, setMouseDownX] = useState<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0 && current < stories.length - 1) {
        setAnimDirection('left');
        setTimeout(() => {
          setCurrent(current + 1);
          setAnimDirection(null);
        }, 250);
      }
      if (deltaX > 0 && current > 0) {
        setAnimDirection('right');
        setTimeout(() => {
          setCurrent(current - 1);
          setAnimDirection(null);
        }, 250);
      }
    }
    setTouchStartX(null);
  }
  function handleMouseDown(e: React.MouseEvent) {
    setMouseDownX(e.clientX);
  }
  function handleMouseUp(e: React.MouseEvent) {
    if (mouseDownX === null) return;
    const deltaX = e.clientX - mouseDownX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0 && current < stories.length - 1) {
        setAnimDirection('left');
        setTimeout(() => {
          setCurrent(current + 1);
          setAnimDirection(null);
        }, 250);
      }
      if (deltaX > 0 && current > 0) {
        setAnimDirection('right');
        setTimeout(() => {
          setCurrent(current - 1);
          setAnimDirection(null);
        }, 250);
      }
    }
    setMouseDownX(null);
  }

  // Classes de animação (apenas na mídia)
  const animClass = animDirection === 'left'
    ? 'animate-story-slide-left'
    : animDirection === 'right'
    ? 'animate-story-slide-right'
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Topo fixo: barra de progresso e perfil */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md flex flex-col gap-0 z-50 pointer-events-none">
          {/* Barra de progresso */}
          <div className="flex gap-1 w-full px-4 pt-4 pointer-events-auto">
            {stories.map((_, i) => (
              <div key={i} className="h-1.5 rounded bg-zinc-700 flex-1 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${i < current ? 'bg-blue-400' : i === current ? 'bg-gradient-to-r from-blue-400 to-pink-400' : ''}`}
                  style={{ width: i === current ? `${progress}%` : i < current ? '100%' : '0%' }}
                />
              </div>
            ))}
          </div>
        {/* Header com avatar, nome, botão pausar e botão fechar */}
        <div className="flex items-center gap-3 w-full px-4 mt-2 mb-2 pointer-events-auto">
          <div className="w-12 h-12 rounded-full border-2 border-blue-400 shadow-lg overflow-hidden flex items-center justify-center bg-zinc-900">
            <img src={story.photoURL || '/default-avatar.png'} alt={story.username} className="w-full h-full object-cover aspect-square" />
          </div>
          <span className="text-zinc-100 font-bold text-lg drop-shadow-md">{story.username}</span>
          <span className="text-xs text-zinc-300 ml-2">{getTimeAgo(story.createdAt)}</span>
          <button
            className="ml-2 px-2 py-1 rounded-full bg-zinc-800 bg-opacity-70 text-zinc-100 hover:bg-zinc-700 text-xl transition shadow-md"
            title="Configurações do story"
            onClick={() => setShowMenu(true)}
          >&#8942;</button>
          <button
            className={`ml-2 px-2 py-1 rounded-full bg-zinc-800 bg-opacity-70 text-zinc-100 hover:bg-zinc-700 text-xl transition shadow-md ${paused ? 'border border-yellow-400' : ''}`}
            title={paused ? "Retomar story" : "Pausar story"}
            onClick={() => setPaused(p => !p)}
          >{paused ? '▶' : '⏸'}</button>
          <button onClick={onClose} className="ml-auto px-3 py-1 rounded-full bg-zinc-800 bg-opacity-70 text-zinc-100 font-bold hover:bg-zinc-700 text-xl transition shadow-md">×</button>
        </div>
        </div>

        {/* Menu de configurações/exclusão do story - fora do header */}
        {showMenu && (
          <div
            className="fixed inset-0 z-50"
            style={{ pointerEvents: 'auto' }}
            onClick={() => setShowMenu(false)}
          >
            <div
              className="absolute top-16 right-6 bg-zinc-900 border border-zinc-700 rounded shadow-lg p-3 flex flex-col gap-2 min-w-[160px]"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="text-red-400 hover:text-red-600 text-sm font-semibold text-left px-2 py-1 rounded transition"
                disabled={!user || user.uid !== story.uid}
                title={!user || user.uid !== story.uid ? "Você só pode excluir seus próprios stories" : ""}
                onClick={async () => {
                  setShowMenu(false);
                  if (!user || user.uid !== story.uid) {
                    alert("Você só pode excluir seus próprios stories.");
                    return;
                  }
                  if (window.confirm('Tem certeza que deseja excluir este story? Essa ação não pode ser desfeita.')) {
                    try {
                      await deleteDoc(doc(db, "stories", story.id));
                      onClose();
                    } catch (e) {
                      alert("Erro ao excluir story");
                    }
                  }
                }}
              >Excluir story</button>
              <button
                className="text-zinc-300 hover:text-zinc-100 text-sm font-semibold text-left px-2 py-1 rounded transition"
                onClick={() => setShowMenu(false)}
              >Cancelar</button>
            </div>
          </div>
        )}
        {/* Espaço para topo fixo */}
        <div className="h-[90px] w-full" />
        {/* Mídia do story com animação */}
        <div className={`w-full flex justify-center items-center mt-2 mb-4 ${animClass}`} key={current}>
          {story.type === "image" ? (
            <img src={story.mediaURL} alt="Story" className="max-h-[60vh] rounded-xl shadow-xl border border-zinc-800 object-contain" />
          ) : (
            <video src={story.mediaURL} controls autoPlay className="max-h-[60vh] rounded-xl shadow-xl border border-zinc-800 object-contain" />
          )}
        </div>
        {/* Navegação lateral flutuante */}
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          aria-label="Anterior"
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-40 w-12 h-12 flex items-center justify-center rounded-full bg-black bg-opacity-30 hover:bg-opacity-60 transition text-white text-3xl shadow-lg border-none ${current === 0 ? 'opacity-30 cursor-default' : 'opacity-80 cursor-pointer'}`}
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 8L12 16L20 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => setCurrent((c) => Math.min(stories.length - 1, c + 1))}
          disabled={current === stories.length - 1}
          aria-label="Próximo"
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-40 w-12 h-12 flex items-center justify-center rounded-full bg-black bg-opacity-30 hover:bg-opacity-60 transition text-white text-3xl shadow-lg border-none ${current === stories.length - 1 ? 'opacity-30 cursor-default' : 'opacity-80 cursor-pointer'}`}
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8L20 16L12 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
