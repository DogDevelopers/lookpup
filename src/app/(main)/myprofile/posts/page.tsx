import { getMyRequests } from "@/features/board/queries";
import MyPostsClient from "@/features/board/components/MyPostsClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("내가 쓴 글");

export default async function MyPostsPage() {
  const posts = await getMyRequests();
  return <MyPostsClient posts={posts} />;
}
