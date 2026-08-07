import WithdrawClient from "@/features/myprofile/components/WithdrawClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("회원 탈퇴");

export default function WithdrawPage() {
  return <WithdrawClient />;
}
