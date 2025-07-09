import { doc, updateDoc } from "firebase/firestore";
import db from "@/lib/firestore";

export async function setUserAdmin(uid: string, isAdmin: boolean) {
  await updateDoc(doc(db, "users", uid), { isAdmin });
}

export async function banUser(uid: string) {
  await updateDoc(doc(db, "users", uid), { banned: true });
}

export async function unbanUser(uid: string) {
  await updateDoc(doc(db, "users", uid), { banned: false });
}
