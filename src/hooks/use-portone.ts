"use client";

import { useState, useRef } from "react";
import type * as PortOneV2 from "@portone/browser-sdk/v2";
import { clientEnv } from "@/lib/env";

type PortOneSDK = typeof PortOneV2;
type PaymentStatus = "idle" | "success" | "fail";
type RequestPaymentBody = Parameters<PortOneSDK["requestPayment"]>[0];
type RequestPaymentParams = Omit<RequestPaymentBody, "storeId" | "channelKey">;

interface PaymentCallbacks {
  onSuccess?: () => void;
  onFail?: (message?: string) => void;
}

export function usePortOne() {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const portOneRef = useRef<PortOneSDK | null>(null);

  const requestPayment = async (
    params: RequestPaymentParams,
    callbacks?: PaymentCallbacks,
  ) => {
    if (isPending) return;

    setIsPending(true);
    setStatus("idle");
    setErrorMessage(null);

    try {
      if (!portOneRef.current) {
        portOneRef.current = await import("@portone/browser-sdk/v2");
      }
      const PortOne = portOneRef.current;

      const response = await PortOne.requestPayment({
        storeId: clientEnv.NEXT_PUBLIC_PORTONE_STORE_ID,
        channelKey: clientEnv.NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY_TOSS,
        ...params,
      });

      if (!response) {
        const message = "결제창이 닫혔습니다.";
        setStatus("fail");
        setErrorMessage(message);
        callbacks?.onFail?.(message);
        return;
      }
      if ("code" in response) {
        const message = response.message ?? "결제에 실패했습니다.";
        setStatus("fail");
        setErrorMessage(message);
        callbacks?.onFail?.(message);
        return;
      }
      setStatus("success");
      callbacks?.onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setStatus("fail");
      setErrorMessage(message);
      callbacks?.onFail?.(message);
    } finally {
      setIsPending(false);
    }
  };

  return { status, errorMessage, isPending, requestPayment };
}
