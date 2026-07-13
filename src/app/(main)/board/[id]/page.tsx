import BoardDetailClient from "@/features/board/components/BoardDetailClient";
import { getRequestDetail, getOtherPostsByOwner } from "@/features/board/queries";
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
      id={id}
      initialPost={post}
      initialOtherPosts={otherPosts}
      currentUserId={user?.id}
      isLoggedIn={!!user}
      isSitter={isSitter}
      isUnapprovedSitter={isUnapprovedSitter}
    />
  );
}
