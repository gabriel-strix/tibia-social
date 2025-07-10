import FollowersListPage from "@/components/FollowersListPage";
import { useParams } from "next/navigation";

export default function ProfileFollowingPage() {
  const params = useParams<{ uid?: string }>();
  const uid = params?.uid || "";
  return <FollowersListPage profileUid={uid} type="following" />;
}
