import { getMyRequests } from "@/features/board/queries";
import MyPostsClient from "@/features/board/components/MyPostsClient";

export default async function MyPostsPage() {
  const posts = await getMyRequests();
  return <MyPostsClient posts={posts} />;
}
