import React, { useRef, useState } from "react";

interface CameraModalProps {
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function CameraModal({ onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');

  React.useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === 'video' });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        alert('Não foi possível acessar a câmera.');
        onClose();
      }
    }
    startCamera();
    return () => {
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [mode, onClose]);

  function handleTakePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.png`, { type: 'image/png' });
        onCapture(file);
        onClose();
      }
    }, 'image/png');
  }

  function handleStartRecording() {
    if (!mediaStreamRef.current) return;
    const recorder = new MediaRecorder(mediaStreamRef.current);
    setChunks([]);
    setMediaRecorder(recorder);
    recorder.ondataavailable = e => {
      if (e.data.size > 0) setChunks(prev => [...prev, e.data]);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
      onCapture(file);
      onClose();
    };
    recorder.start();
    setRecording(true);
  }

  function handleStopRecording() {
    mediaRecorder?.stop();
    setRecording(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-zinc-900 rounded-lg p-6 flex flex-col items-center gap-4 relative w-full max-w-md">
        <button onClick={onClose} className="absolute top-2 right-2 text-zinc-400 hover:text-red-400 text-2xl">&times;</button>
        <video ref={videoRef} autoPlay playsInline className="rounded w-full max-h-80 bg-black" />
        <div className="flex gap-4 mt-2">
          <button
            className={`px-4 py-2 rounded ${mode === 'photo' ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-200'}`}
            onClick={() => setMode('photo')}
            disabled={recording}
          >Foto</button>
          <button
            className={`px-4 py-2 rounded ${mode === 'video' ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-200'}`}
            onClick={() => setMode('video')}
            disabled={recording}
          >Vídeo</button>
        </div>
        {mode === 'photo' && (
          <button
            className="mt-4 px-6 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-lg font-bold"
            onClick={handleTakePhoto}
          >Tirar foto</button>
        )}
        {mode === 'video' && !recording && (
          <button
            className="mt-4 px-6 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-lg font-bold"
            onClick={handleStartRecording}
          >Gravar vídeo</button>
        )}
        {mode === 'video' && recording && (
          <button
            className="mt-4 px-6 py-2 rounded bg-yellow-500 text-zinc-900 hover:bg-yellow-600 text-lg font-bold animate-pulse"
            onClick={handleStopRecording}
          >Parar gravação</button>
        )}
      </div>
    </div>
  );
}
