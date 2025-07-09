import { collection, getDoc, doc } from "firebase/firestore";
import db from "@/lib/firestore";

export async function getPostById(postId: string) {
  const postDoc = await getDoc(doc(db, "posts", postId));
  return postDoc.exists() ? { id: postDoc.id, ...postDoc.data() } : null;
}
