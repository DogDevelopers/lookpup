"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { signInWithOAuth } from "@/features/auth/actions";
import type { Provider } from "@/features/auth/schema";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [isPending, startTransition] = useTransition();

  const handleOAuthLogin = (provider: Provider) => {
    startTransition(async () => {
      const result = await signInWithOAuth(provider, next);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900 text-center mb-2">
        로그인
      </h1>
      <p className="text-gray-500 text-sm text-center mb-8">
        카카오 또는 구글 계정으로 로그인하세요
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => handleOAuthLogin("kakao")}
          disabled={isPending}
          className="w-full h-14 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#FEE500" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10 2C5.582 2 2 4.832 2 8.318c0 2.2 1.378 4.133 3.46 5.26l-.882 3.284a.25.25 0 00.378.272L9.1 14.6c.296.033.597.05.9.05 4.418 0 8-2.832 8-6.332S14.418 2 10 2z"
              fill="#3C1E1E"
            />
          </svg>
          <span className="text-zinc-900 text-base font-medium">
            카카오로 계속하기
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleOAuthLogin("google")}
          disabled={isPending}
          className="w-full h-14 bg-white hover:bg-gray-50 border border-orange-100 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M18.17 10.23c0-.68-.06-1.33-.17-1.96H10v3.71h4.58a3.92 3.92 0 01-1.7 2.57v2.13h2.75c1.61-1.48 2.54-3.67 2.54-6.45z"
              fill="#4285F4"
            />
            <path
              d="M10 18.5c2.3 0 4.23-.76 5.63-2.06l-2.75-2.13c-.76.51-1.74.82-2.88.82-2.21 0-4.08-1.49-4.75-3.5H2.4v2.2A8.5 8.5 0 0010 18.5z"
              fill="#34A853"
            />
            <path
              d="M5.25 11.63A5.1 5.1 0 015 10c0-.57.1-1.12.25-1.63V6.17H2.4A8.5 8.5 0 001.5 10c0 1.37.33 2.67.9 3.83l2.85-2.2z"
              fill="#FBBC05"
            />
            <path
              d="M10 4.87c1.25 0 2.37.43 3.25 1.27l2.44-2.44C14.22 2.34 12.3 1.5 10 1.5A8.5 8.5 0 002.4 6.17l2.85 2.2C5.92 6.36 7.79 4.87 10 4.87z"
              fill="#EA4335"
            />
          </svg>
          <span className="text-stone-900 text-base font-medium">
            구글로 계속하기
          </span>
        </button>
      </div>

      <p className="text-center text-gray-500 text-xs mt-5 leading-5">
        계속 진행하면{" "}
        <Link href="/terms" className="underline hover:text-stone-700">
          이용약관
        </Link>{" "}
        및 개인정보 처리방침에 동의하는 것으로 간주합니다
      </p>
    </>
  );
}
