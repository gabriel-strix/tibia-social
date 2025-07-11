import { collection, query, where, onSnapshot } from "firebase/firestore";
import db from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";

export function listenUnreadNotifications(uid: string, callback: (count: number) => void) {
  const q = query(
    collection(db, "notifications", uid, "items"),
    where("read", "==", false)
  );
  let prefs: any = {};
  // Busca preferências do usuário uma vez
  getDoc(doc(db, "users", uid)).then(docSnap => {
    prefs = docSnap.exists() ? docSnap.data().notificationPrefs || {} : {};
  });
  return onSnapshot(q, (snap) => {
    const filtered = snap.docs.filter(doc => {
      const n = doc.data();
      if (n.type === "like" && prefs.like === false) return false;
      if (n.type === "comment" && prefs.comment === false) return false;
      if (n.type === "message" && prefs.message === false) return false;
      if (n.type === "follow" && prefs.follow === false) return false;
      return true;
    });
    callback(filtered.length);
  });
}
