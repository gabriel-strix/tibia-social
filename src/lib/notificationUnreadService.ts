import { collection, query, where, onSnapshot } from "firebase/firestore";
import db from "@/lib/firestore";

export function listenUnreadNotifications(uid: string, callback: (count: number) => void) {
  const q = query(
    collection(db, "notifications", uid, "items"),
    where("read", "==", false)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.size);
  });
}
