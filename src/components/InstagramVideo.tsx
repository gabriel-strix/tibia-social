import { useRef, useEffect, useState } from "react";

interface InstagramVideoProps {
  src: string;
  poster?: string;
}

export default function InstagramVideo({ src, poster }: InstagramVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Pausa o vídeo quando sai da tela
  useEffect(() => {
    const handleScroll = () => {
      if (!videoRef.current) return;
      const rect = videoRef.current.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!isVisible && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Play automático quando visível
  useEffect(() => {
    const handleScroll = () => {
      if (!videoRef.current) return;
      const rect = videoRef.current.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (isVisible && videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else if (!isVisible && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    // Executa ao montar
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Play/pause ao clicar no vídeo
  const handleVideoClick = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Alterna mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-xl mx-auto"
      style={{ maxHeight: "80vh", aspectRatio: "9/16", width: "min(360px, 100vw)" }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        style={{ maxHeight: "80vh" }}
        muted={isMuted}
        controls={false}
        playsInline
        onClick={handleVideoClick}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />
      {/* Botão de play/pause central */}
      {!isPlaying && (
        <button
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 rounded-full p-3 text-white text-3xl"
          onClick={handleVideoClick}
          aria-label="Play"
        >
          ▶
        </button>
      )}
      {/* Botão de mute/desmute */}
      <button
        className="absolute bottom-3 right-3 bg-black/60 rounded-full p-2 text-white text-lg"
        onClick={toggleMute}
        aria-label={isMuted ? "Ativar som" : "Desativar som"}
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}
