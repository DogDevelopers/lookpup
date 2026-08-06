import Link from "next/link";
import Image from "next/image";
import LoginForm from "@/features/auth/components/LoginForm";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("로그인");

export default function LoginPage() {
  return (
    <div className="w-full max-w-[460px] flex flex-col items-start">
      <div className="w-full flex flex-col items-center gap-2 mb-8">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="봐주개"
            width={160}
            height={48}
            priority
            className="object-contain h-auto"
          />
        </Link>
        <p className="text-gray-500 text-base">반려동물 돌봄 플랫폼</p>
      </div>

      <div className="w-full p-8 bg-white rounded-2xl shadow-[0px_2px_12px_0px_rgba(232,116,42,0.10)] border border-orange-100 flex flex-col">
        <LoginForm />
      </div>
    </div>
  );
}
