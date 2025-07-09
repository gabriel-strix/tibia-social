import FollowersListPage from "@/components/FollowersListPage";

export default function ProfileFollowersPage({ params }: { params: { uid: string } }) {
  return <FollowersListPage profileUid={params.uid} type="followers" />;
}
