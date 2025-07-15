import React, { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import db from "@/lib/firestore";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function StoryUploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  }

  // Função para converter imagem para webp
  async function convertToWebP(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas não suportado');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return reject('Falha ao converter para WebP');
          const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
          resolve(webpFile);
        }, 'image/webp', 0.92);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleUpload() {
    if (!file || !user) return;
    setUploading(true);
    try {
      const storage = getStorage();
      let fileToUpload = file;
      let ext = 'video';
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await convertToWebP(file);
          ext = 'image';
        } catch (e) {
          alert('Falha ao converter imagem para WebP. Enviando original.');
          ext = 'image';
        }
      }
      const storageRef = ref(storage, `stories/${user.uid}/${Date.now()}-${fileToUpload.name}`);
      await uploadBytes(storageRef, fileToUpload);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "stories"), {
        uid: user.uid,
        username: user.displayName || user.email || "",
        photoURL: user.photoURL || '',
        mediaURL: url,
        type: ext,
        createdAt: Timestamp.now(),
      });
      setFile(null);
      setPreview(null);
      onClose();
    } catch (err) {
      alert("Erro ao enviar story");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-zinc-900 rounded-lg p-6 shadow-lg w-full max-w-sm flex flex-col items-center gap-4">
        <h2 className="text-lg font-bold text-zinc-100">Adicionar Story</h2>
        <input
          type="file"
          accept="image/*,video/*"
          ref={inputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          onClick={() => inputRef.current?.click()}
        >Selecionar arquivo</button>
        {preview && (
          <div className="w-full flex justify-center">
            {file?.type.startsWith('image') ? (
              <img src={preview} alt="Preview" className="max-h-48 rounded" />
            ) : (
              <video src={preview} controls className="max-h-48 rounded" />
            )}
          </div>
        )}
        <button
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold w-full"
          onClick={handleUpload}
          disabled={!file || uploading}
        >{uploading ? "Enviando..." : "Enviar Story"}</button>
        <button
          className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-800 text-white font-semibold w-full"
          onClick={onClose}
        >Cancelar</button>
      </div>
    </div>
  );
}
