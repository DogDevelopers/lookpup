"use client";

import { useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { clientEnv } from "@/lib/env";

type VerificationProps = {
  onVerified: (
    identityVerificationId: string,
  ) => Promise<{ error?: string } | void>;
  onSuccess?: () => void;
  buttonText?: string;
};

export default function Verification({
  onVerified,
  onSuccess,
  buttonText = "본인인증하기",
}: VerificationProps) {
  const [isPending, startTransition] = useTransition();

  const handleVerify = () => {
    startTransition(async () => {
      const PortOne = await import("@portone/browser-sdk/v2");
      const identityVerificationId = `identity-${crypto.randomUUID()}`;

      const response = await PortOne.requestIdentityVerification({
        storeId: clientEnv.NEXT_PUBLIC_PORTONE_STORE_ID,
        channelKey: clientEnv.NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY,
        identityVerificationId,
      });

      if (!response || response.code) {
        toast.error(response?.message ?? "본인인증에 실패했습니다.");
        return;
      }

      const result = await onVerified(identityVerificationId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      onSuccess?.();
    });
  };

  return (
    <button
      type="button"
      onClick={handleVerify}
      disabled={isPending}
      className="w-full h-14 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 text-white rounded-xl flex items-center justify-center gap-3 text-base font-medium transition-colors"
    >
      <ShieldCheck size={18} />
      {isPending ? "처리 중..." : buttonText}
    </button>
  );
}
