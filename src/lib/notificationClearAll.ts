import { collection, getDocs, deleteDoc } from "firebase/firestore";
import db from "@/lib/firestore";

export async function clearAllNotifications(uid: string) {
  const col = collection(db, "notifications", uid, "items");
  const snap = await getDocs(col);
  const promises = snap.docs.map(docSnap => deleteDoc(docSnap.ref));
  await Promise.all(promises);
}
