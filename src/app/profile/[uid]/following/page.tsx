import FollowersListPage from "@/components/FollowersListPage";

export default function ProfileFollowingPage({ params }) {
  return <FollowersListPage profileUid={params.uid} type="following" />;
}
