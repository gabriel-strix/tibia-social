import { collection, addDoc, Timestamp } from "firebase/firestore";
import db from "@/lib/firestore";

export type NotificationType = "comment" | "like" | "follow" | "message";

export interface Notification {
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
  await addDoc(collection(db, "notifications", notification.toUid, "items"), {
    ...notification,
    read: false,
    createdAt: Timestamp.now(),
  });
}
