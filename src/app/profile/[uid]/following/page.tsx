import FollowersListPage from "@/components/FollowersListPage";

export default function ProfileFollowingPage({ params }: { params: { uid: string } }) {
  return <FollowersListPage profileUid={params.uid} type="following" />;
}
