"use client";

import { useRouter } from "next/navigation";
import Verification from "@/features/auth/components/Verification";
import { confirmIdentityVerification } from "@/features/auth/actions";

export default function VerificationForm({ next = "/" }: { next?: string }) {
  const router = useRouter();

  return (
    <Verification
      onVerified={async (identityVerificationId) => {
        const result = await confirmIdentityVerification(identityVerificationId);
        if (!result.ok) {
          return { error: result.error };
        }
      }}
      onSuccess={() => router.push(next)}
    />
  );
}
