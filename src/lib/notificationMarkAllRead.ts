import { collection, getDocs, writeBatch } from "firebase/firestore";
import db from "@/lib/firestore";

export async function markAllNotificationsAsRead(uid: string) {
  const col = collection(db, "notifications", uid, "items");
  const snap = await getDocs(col);
  const batch = writeBatch(db);
  snap.docs.forEach(docSnap => {
    if (!docSnap.data().read) {
      batch.update(docSnap.ref, { read: true });
    }
  });
  await batch.commit();
}
