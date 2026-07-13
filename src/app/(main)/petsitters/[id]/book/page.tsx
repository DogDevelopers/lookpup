import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingClient from "@/features/petsitters/components/BookingClient";

// TODO: features/petsitters/queries.ts로 sitter/bookedRanges, pet-register 이식 후 pets 실데이터를 조회해 전달.
export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookPath = `/petsitters/${id}/book`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(bookPath)}`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_verified) {
    redirect(`/auth/verification?next=${encodeURIComponent(bookPath)}`);
  }

  return <BookingClient sitterId={id} />;
}
