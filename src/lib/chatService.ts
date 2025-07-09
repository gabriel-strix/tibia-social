import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, doc, setDoc, getDocs, updateDoc, where, getDocs as getDocsFn } from "firebase/firestore";
import db from "@/lib/firestore";

export type ChatMessage = {
  id?: string;
  from: string;
  to: string;
  text: string;
  createdAt: Timestamp;
  readBy?: string[];
};

export async function sendMessage(from: string, to: string, text: string) {
  const chatId = getChatId(from, to);
  const messagesRef = collection(db, "chats", chatId, "messages");
  await addDoc(messagesRef, {
    from,
    to,
    text,
    createdAt: Timestamp.now(),
    readBy: [from], // Remetente já leu
  });
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
