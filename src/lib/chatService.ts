import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, doc, setDoc, getDocs, updateDoc, where, getDocs as getDocsFn, deleteDoc } from "firebase/firestore";
import db from "@/lib/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export type ChatMessage = {
  id?: string;
  from: string;
  to: string;
  text: string;
  createdAt: Timestamp;
  readBy?: string[];
  imageURL?: string;
  videoURL?: string;
  audioURL?: string; // Novo campo para áudio
};

// Função para upload de imagem (WebP), vídeo ou áudio
async function uploadChatMedia(file: File, chatId: string, msgId: string): Promise<{ imageURL?: string; videoURL?: string; audioURL?: string }> {
  const storage = getStorage();
  if (file.type.startsWith('image/')) {
    // Converte para WebP
    let fileToUpload = file;
    if (!file.type.includes('webp')) {
      fileToUpload = await new Promise((resolve, reject) => {
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
    const imageRef = ref(storage, `chats/${chatId}/messages/${msgId}/${fileToUpload.name}`);
    await uploadBytes(imageRef, fileToUpload);
    const url = await getDownloadURL(imageRef);
    return { imageURL: url };
  } else if (file.type.startsWith('video/')) {
    const videoRef = ref(storage, `chats/${chatId}/messages/${msgId}/${file.name}`);
    await uploadBytes(videoRef, file);
    const url = await getDownloadURL(videoRef);
    return { videoURL: url };
  } else if (file.type.startsWith('audio/')) {
    const audioRef = ref(storage, `chats/${chatId}/messages/${msgId}/${file.name}`);
    await uploadBytes(audioRef, file);
    const url = await getDownloadURL(audioRef);
    return { audioURL: url };
  }
  return {};
}

export async function sendMessage(from: string, to: string, text: string, file?: File) {
  const chatId = getChatId(from, to);
  const messagesRef = collection(db, "chats", chatId, "messages");
  // Cria mensagem sem mídia para pegar o ID
  const msgDoc = await addDoc(messagesRef, {
    from,
    to,
    text,
    createdAt: Timestamp.now(),
    readBy: [from],
    imageURL: "",
    videoURL: "",
    audioURL: "",
  });
  if (file) {
    const media = await uploadChatMedia(file, chatId, msgDoc.id);
    await updateDoc(doc(messagesRef, msgDoc.id), media);
  }
}

export function getChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("_");
}

export function listenMessages(uid1: string, uid2: string, callback: (msgs: ChatMessage[]) => void) {
  const chatId = getChatId(uid1, uid2);
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const msgs: ChatMessage[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
    callback(msgs);
  });
}

// Marca todas as mensagens recebidas como lidas para o usuário logado
export async function markMessagesAsRead(myUid: string, otherUid: string) {
  const chatId = getChatId(myUid, otherUid);
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, where("to", "==", myUid));
  const snapshot = await getDocsFn(q);
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (!data.readBy || !data.readBy.includes(myUid)) {
      await updateDoc(doc(messagesRef, docSnap.id), {
        readBy: [...(data.readBy || []), myUid],
      });
    }
  }
}

// Conta mensagens não lidas para o usuário logado em todos os chats
export async function countUnreadMessages(uid: string): Promise<number> {
  let total = 0;
  const chatsRef = collection(db, "chats");
  const chatsSnap = await getDocsFn(chatsRef);
  for (const chatDoc of chatsSnap.docs) {
    const chatId = chatDoc.id;
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, where("to", "==", uid));
    const snapshot = await getDocsFn(q);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (!data.readBy || !data.readBy.includes(uid)) {
        total++;
      }
    }
  }
  return total;
}

export async function deleteMessage(chatId: string, messageId: string, imageURL?: string, videoURL?: string, audioURL?: string) {
  // Remove mídia do Storage se existir
  const storage = getStorage();
  if (imageURL) {
    try {
      const baseUrl = `https://firebasestorage.googleapis.com/v0/b/`;
      const storageBucket = storage.app.options.storageBucket;
      let filePath = '';
      if (storageBucket && imageURL.startsWith(baseUrl + storageBucket)) {
        const urlParts = imageURL.split(`/${storageBucket}/o/`);
        if (urlParts.length > 1) {
          filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        }
      }
      if (filePath) {
        const imageRef = ref(storage, filePath);
        await deleteObject(imageRef);
      }
    } catch {}
  }
  if (videoURL) {
    try {
      const baseUrl = `https://firebasestorage.googleapis.com/v0/b/`;
      const storageBucket = storage.app.options.storageBucket;
      let filePath = '';
      if (storageBucket && videoURL.startsWith(baseUrl + storageBucket)) {
        const urlParts = videoURL.split(`/${storageBucket}/o/`);
        if (urlParts.length > 1) {
          filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        }
      }
      if (filePath) {
        const videoRef = ref(storage, filePath);
        await deleteObject(videoRef);
      }
    } catch {}
  }
  if (audioURL) {
    try {
      const baseUrl = `https://firebasestorage.googleapis.com/v0/b/`;
      const storageBucket = storage.app.options.storageBucket;
      let filePath = '';
      if (storageBucket && audioURL.startsWith(baseUrl + storageBucket)) {
        const urlParts = audioURL.split(`/${storageBucket}/o/`);
        if (urlParts.length > 1) {
          filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        }
      }
      if (filePath) {
        const audioRef = ref(storage, filePath);
        await deleteObject(audioRef);
      }
    } catch {}
  }
  await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
}
