import { doc, deleteDoc, setDoc, updateDoc, arrayUnion, arrayRemove, getDocs, collection } from "firebase/firestore";
import db from "@/lib/firestore";
import { getAuth, deleteUser } from "firebase/auth";

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

/**
 * Exclui permanentemente a conta do usuário e todos os dados relacionados.
 * @param uid UID do usuário a ser excluído
 */
export async function deleteUserAccount(uid: string) {
  // Remove posts
  const postsSnap = await getDocs(collection(db, "posts"));
  for (const post of postsSnap.docs) {
    if (post.data().uid === uid) {
      await deleteDoc(doc(db, "posts", post.id));
    }
  }
  // Remove mensagens
  const chatsSnap = await getDocs(collection(db, "chats"));
  for (const chat of chatsSnap.docs) {
    if (chat.id.includes(uid)) {
      await deleteDoc(doc(db, "chats", chat.id));
    }
  }
  // Remove seguidores/seguindo
  const followingSnap = await getDocs(collection(db, "users", uid, "following"));
  for (const docu of followingSnap.docs) {
    await deleteDoc(doc(db, "users", uid, "following", docu.id));
  }
  const followersSnap = await getDocs(collection(db, "users", uid, "followers"));
  for (const docu of followersSnap.docs) {
    await deleteDoc(doc(db, "users", uid, "followers", docu.id));
  }
  // Remove notificações
  const notificationsSnap = await getDocs(collection(db, "notifications", uid, "items"));
  for (const docu of notificationsSnap.docs) {
    await deleteDoc(doc(db, "notifications", uid, "items", docu.id));
  }
  // Remove bloqueios
  const blockedSnap = await getDocs(collection(db, "users", uid, "blocked"));
  for (const docu of blockedSnap.docs) {
    await deleteDoc(doc(db, "users", uid, "blocked", docu.id));
  }
  // Remove perfil
  await deleteDoc(doc(db, "users", uid));
  // Remove do Auth
  const auth = getAuth();
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await deleteUser(auth.currentUser);
  }
}
