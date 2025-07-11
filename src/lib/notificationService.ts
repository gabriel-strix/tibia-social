import { collection, addDoc, Timestamp } from "firebase/firestore";
import db from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";

export type NotificationType = "comment" | "like" | "follow" | "message";

export interface Notification {
  id?: string; // Identificador único da notificação, opcional na criação
  toUid: string;
  fromUid: string;
  fromName: string;
  fromPhotoURL: string;
  type: NotificationType;
  text: string;
  createdAt: Timestamp;
  postId?: string;
  commentId?: string; // Adicionado para notificação de curtida de comentário
  read?: boolean;
}

export async function sendNotification(notification: Notification) {
  // Busca preferências do usuário antes de criar a notificação
  const userDoc = await getDoc(doc(db, "users", notification.toUid));
  const prefs = userDoc.exists() ? userDoc.data().notificationPrefs || {} : {};
  if (
    (notification.type === "like" && prefs.like === false) ||
    (notification.type === "comment" && prefs.comment === false) ||
    (notification.type === "message" && prefs.message === false) ||
    (notification.type === "follow" && prefs.follow === false)
  ) {
    // Preferência desativada, não cria notificação
    return;
  }
  await addDoc(collection(db, "notifications", notification.toUid, "items"), {
    ...notification,
    read: false,
    createdAt: Timestamp.now(),
  });
}
