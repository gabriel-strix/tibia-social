import { doc, deleteDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import db from "@/lib/firestore";

/**
 * Bloqueia um usuário e remove ambos das listas de seguidores/seguindo.
 * @param currentUid UID do usuário que está bloqueando
 * @param targetUid UID do usuário a ser bloqueado
 */
export async function blockUserAndUnfollow(currentUid: string, targetUid: string) {
  // Remove targetUid da sua lista de seguindo e seguidores
  await deleteDoc(doc(db, "users", currentUid, "following", targetUid));
  await deleteDoc(doc(db, "users", currentUid, "followers", targetUid));
  // Remove você da lista de seguindo e seguidores do targetUid
  await deleteDoc(doc(db, "users", targetUid, "following", currentUid));
  await deleteDoc(doc(db, "users", targetUid, "followers", currentUid));
  // Adiciona o bloqueio (Firestore: users/{currentUid}/blocked/{targetUid})
  await setDoc(doc(db, "users", currentUid, "blocked", targetUid), {
    blockedAt: new Date(),
  });
  // Adiciona o UID ao array blockedUsers do usuário que está bloqueando
  await updateDoc(doc(db, "users", currentUid), { blockedUsers: arrayUnion(targetUid) });
}

/**
 * Desbloqueia um usuário e remove o bloqueio do array e do documento.
 * @param currentUid UID do usuário que está desbloqueando
 * @param targetUid UID do usuário a ser desbloqueado
 */
export async function unblockUserAndRestore(currentUid: string, targetUid: string) {
  // Remove do array blockedUsers
  await updateDoc(doc(db, "users", currentUid), { blockedUsers: arrayRemove(targetUid) });
  // Remove o documento de bloqueio
  await deleteDoc(doc(db, "users", currentUid, "blocked", targetUid));
}
