import FollowersListPage from "@/components/FollowersListPage";

interface PageProps {
  params: {
    uid: string;
  };
}

export default function ProfileFollowersPage({ params }: PageProps) {
  return <FollowersListPage profileUid={params.uid} type="followers" />;
}
