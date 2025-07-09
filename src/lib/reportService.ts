import { collection, addDoc, Timestamp } from "firebase/firestore";
import db from "@/lib/firestore";

export type ReportType = "post" | "comment";

export interface Report {
  type: ReportType;
  contentId: string;
  contentText: string;
  reportedByUid: string;
  reportedByName: string;
  reportedByPhotoURL: string;
  reportedUserUid: string;
  reportedUserName: string;
  reportedUserPhotoURL: string;
  reason: string;
  createdAt: Timestamp;
  postId?: string; // Adicionado para denúncias de comentário
  resolved?: boolean;
  actionTaken?: string;
}

export async function sendReport(report: Report) {
  await addDoc(collection(db, "reports"), {
    ...report,
    resolved: false,
    createdAt: Timestamp.now(),
  });
}
