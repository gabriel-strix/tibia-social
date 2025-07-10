import FollowersListPage from "@/components/FollowersListPage";

type Props = { params: { uid: string } };

export default function ProfileFollowersPage({ params }: Props) {
  return <FollowersListPage profileUid={params.uid} type="followers" />;
}
