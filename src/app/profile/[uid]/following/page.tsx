import FollowersListPage from "@/components/FollowersListPage";

interface PageProps {
  params: {
    uid: string;
  };
}

export default function ProfileFollowingPage({ params }: PageProps) {
  return <FollowersListPage profileUid={params.uid} type="following" />;
}
