import BoardDetailClient from "@/features/board/components/BoardDetailClient";
import { getRequestDetail, getOtherPostsByOwner } from "@/features/board/queries";
import { incrementRequestViewCount } from "@/features/board/actions";
import { createClient } from "@/lib/supabase/server";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 조회 전에 증가시켜야 방금 올린 조회가 화면에 반영된다.
  await incrementRequestViewCount(id);

  const post = await getRequestDetail(id);
  const otherPosts = post ? await getOtherPostsByOwner(post.owner_id, id) : [];

  let isSitter = false;
  let isUnapprovedSitter = false;
  if (user) {
    const { data: sitter } = await supabase
      .from("sitters")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    isSitter = !!sitter;
    isUnapprovedSitter = !!sitter && sitter.status !== "approved";
  }

  return (
    <BoardDetailClient
      initialPost={post}
      initialOtherPosts={otherPosts}
      currentUserId={user?.id}
      isLoggedIn={!!user}
      isSitter={isSitter}
      isUnapprovedSitter={isUnapprovedSitter}
    />
  );
}
