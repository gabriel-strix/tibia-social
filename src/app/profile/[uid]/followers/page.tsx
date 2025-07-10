import FollowersListPage from "@/components/FollowersListPage";

// Remover tipagem manual e usar a inferida pelo Next.js
export default function ProfileFollowersPage({ params }: { params: { uid: string } }) {
  return <FollowersListPage profileUid={params.uid} type="followers" />;
}
