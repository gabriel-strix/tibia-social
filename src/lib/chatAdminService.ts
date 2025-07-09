import { collection, deleteDoc, getDocs, doc } from "firebase/firestore";
import db from "@/lib/firestore";

export async function clearChatMessages(chatId: string) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const snap = await getDocs(messagesRef);
  const promises = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(promises);
}

export async function deleteChat(chatId: string) {
  // Remove todas as mensagens
  await clearChatMessages(chatId);
  // Remove o documento do chat (se existir)
  await deleteDoc(doc(db, "chats", chatId));
}
