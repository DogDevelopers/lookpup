import { redirect } from "next/navigation";
import { getMySitterProfile } from "@/features/sitter-register/actions";
import { getSitterReviews } from "@/features/petsitters/queries";
import SitterProfilePreviewClient from "@/features/sitter-register/components/SitterProfilePreviewClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("펫시터 프로필 미리보기");

export default async function SitterProfilePreviewPage() {
  const sitter = await getMySitterProfile();

  if (!sitter) {
    redirect("/sitter-register");
  }

  const reviews = await getSitterReviews(sitter.id);

  return <SitterProfilePreviewClient sitter={sitter} reviews={reviews} />;
}
