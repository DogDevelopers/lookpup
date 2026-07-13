import { redirect } from "next/navigation";
import { getMySitterProfile, getSitterServices } from "@/features/sitter-register/actions";
import SitterEditClient from "@/features/sitter-register/components/SitterEditClient";

export default async function SitterEditPage() {
  const sitter = await getMySitterProfile();

  if (!sitter) {
    redirect("/sitter-register");
  }

  const services = await getSitterServices(sitter.id);

  return <SitterEditClient sitter={sitter} initialServices={services} />;
}
