import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VerificationForm from "@/features/auth/components/VerificationForm";

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { next } = await searchParams;
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  const { data: profile } = await supabase
    .from("users")
    .select("is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_verified) {
    redirect(redirectTo);
  }

  return (
    <div className="w-full max-w-[460px] flex flex-col items-start">
      <div className="w-full flex flex-col items-center gap-2 mb-8">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="봐주개"
            width={160}
            height={48}
            className="object-contain h-auto"
          />
        </Link>
        <p className="text-gray-500 text-base">반려동물 돌봄 플랫폼</p>
      </div>

      <div className="w-full p-8 bg-white rounded-2xl shadow-[0px_2px_12px_0px_rgba(232,116,42,0.10)] border border-orange-100 flex flex-col">
        <h1 className="text-2xl font-bold text-stone-900 text-center mb-2">
          본인인증
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          본인인증을 완료하면 바로 이용할 수 있어요
        </p>

        <VerificationForm next={redirectTo} />
      </div>
    </div>
  );
}
