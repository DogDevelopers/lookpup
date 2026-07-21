import { redirect } from "next/navigation";
import { getMySitterProfile, getSitterServices } from "@/features/sitter-register/actions";
import { getMyBankAccount } from "@/lib/bank-account/actions";
import SitterEditClient from "@/features/sitter-register/components/SitterEditClient";

export default async function SitterEditPage() {
  const sitter = await getMySitterProfile();

  if (!sitter) {
    redirect("/sitter-register");
  }

  const [services, bankAccount] = await Promise.all([
    getSitterServices(sitter.id),
    getMyBankAccount(),
  ]);

  return <SitterEditClient sitter={sitter} initialServices={services} initialBankAccount={bankAccount} />;
}
