import { collection, deleteDoc, getDocs, doc } from "firebase/firestore";
import db from "@/lib/firestore";
import { deleteMessage } from "@/lib/chatService";

export async function clearChatMessages(chatId: string) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const snap = await getDocs(messagesRef);
  const promises = snap.docs.map((d) => {
    const data = d.data();
    return deleteMessage(chatId, d.id, data.imageURL, data.videoURL);
  });
  await Promise.all(promises);
}

export async function deleteChat(chatId: string) {
  // Remove todas as mensagens (com mídia)
  await clearChatMessages(chatId);
  // Remove o documento do chat (se existir)
  await deleteDoc(doc(db, "chats", chatId));
}
