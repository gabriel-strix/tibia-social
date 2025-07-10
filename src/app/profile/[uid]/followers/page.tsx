import FollowersListPage from "@/components/FollowersListPage";

export default function ProfileFollowersPage({ params }) {
  return <FollowersListPage profileUid={params.uid} type="followers" />;
}
