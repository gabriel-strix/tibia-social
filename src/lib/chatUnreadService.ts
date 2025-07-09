import { collection, onSnapshot } from "firebase/firestore";
import db from "@/lib/firestore";
import { countUnreadMessages } from "@/lib/chatService";

// Retorna unsubscribe
export function listenUnreadMessages(uid: string, callback: (count: number) => void) {
  // Escuta mudanças em todos os chats para atualizar o contador em tempo real
  const chatsRef = collection(db, "chats");
  const unsub = onSnapshot(chatsRef, async () => {
    const count = await countUnreadMessages(uid);
    callback(count);
  });
  // Atualiza imediatamente ao iniciar
  countUnreadMessages(uid).then(callback);
  return unsub;
}
