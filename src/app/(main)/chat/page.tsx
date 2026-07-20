import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChatRoomsData } from "@/features/chat/actions/room-actions";
import ChatClient from "@/features/chat/components/ChatClient";
import { Spinner } from "@/components/ui/spinner";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_verified")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_verified) redirect("/auth/verification");

  const roomsResult = await getChatRoomsData();

  return (
    <Suspense fallback={<Spinner className="size-6 mx-auto mt-20" />}>
      <ChatClient initialRoomsData={roomsResult.ok ? roomsResult.data : undefined} />
    </Suspense>
  );
}
