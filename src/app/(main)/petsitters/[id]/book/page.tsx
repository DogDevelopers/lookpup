import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingClient from "@/features/petsitters/components/BookingClient";
import { getSitterBookingInfo, getBookedRanges, getUserPets } from "@/features/petsitters/queries";

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

  const [sitter, bookedRanges, pets] = await Promise.all([
    getSitterBookingInfo(id),
    getBookedRanges(id),
    getUserPets(user.id),
  ]);

  return <BookingClient sitterId={id} sitter={sitter} bookedRanges={bookedRanges} pets={pets} />;
}
