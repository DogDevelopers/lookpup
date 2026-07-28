import { redirect } from "next/navigation";
import { getMySitterProfile } from "@/features/sitter-register/actions";
import SitterProfilePreviewClient from "@/features/sitter-register/components/SitterProfilePreviewClient";

export default async function SitterProfilePreviewPage() {
  const sitter = await getMySitterProfile();

  if (!sitter) {
    redirect("/sitter-register");
  }

  return <SitterProfilePreviewClient sitter={sitter} />;
}
