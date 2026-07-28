"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { restoreUser, signOut } from "@/features/auth/actions";

export default function RestoreForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreUser();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/auth/verification");
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleRestore}
        disabled={isPending}
        className="w-full h-14 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 text-white rounded-xl flex items-center justify-center gap-2 text-base font-medium transition-colors"
      >
        <RotateCcw size={18} />
        {isPending ? "복구 중..." : "계정 복구하기"}
      </button>

      <button
        type="button"
        onClick={() => signOut()}
        className="w-full h-14 border border-orange-100 text-gray-500 rounded-xl flex items-center justify-center gap-2 text-base font-medium hover:bg-orange-50 transition-colors"
      >
        <LogOut size={18} />
        다른 계정으로 로그인
      </button>
    </div>
  );
}
