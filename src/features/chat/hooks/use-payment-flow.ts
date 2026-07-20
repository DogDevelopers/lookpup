import { useCallback, useState } from "react";
import { sendPaymentRequestMessage, sendPaymentCompleteMessage } from "@/features/chat/actions/payment-message-actions";
import { getActiveReservationsForRoom } from "@/features/reservations/actions";
import { createPayment, createExtraPayment, getActiveReservationBySitter, verifyAndConfirmPayment, cancelPendingPayment } from "@/features/payments/actions";
import { toRow, getPaymentDeadline } from "@/features/chat/utils";
import type { ChatMessageRow } from "@/features/chat/types";
import type { usePortOne } from "@/hooks/use-portone";

type SelectedRoom = { reservationId: string | null; sitterId: string | null } | undefined;

export function usePaymentFlow(params: {
  activeRoomId: string | null;
  selectedRoom: SelectedRoom;
  isPaymentAlreadyPaid: boolean;
  isPaymentPending: boolean;
  requestPayment: ReturnType<typeof usePortOne>["requestPayment"];
  deliverMessage: (roomId: string, message: ChatMessageRow) => void;
  updatePreview: (roomId: string, text: string, time: string) => void;
  setSendError: (error: string | null) => void;
}) {
  const { activeRoomId, selectedRoom, isPaymentAlreadyPaid, isPaymentPending, requestPayment, deliverMessage, updatePreview, setSendError } = params;

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentReservationAmount, setPaymentReservationAmount] = useState<number | undefined>(undefined);
  const [payingNow, setPayingNow] = useState(false);

  const closePaymentModal = useCallback(() => setPaymentModalOpen(false), []);

  const handleOpenPaymentModal = useCallback(async () => {
    setPaymentModalOpen(true);
    if (!activeRoomId) {
      setPaymentReservationAmount(undefined);
      return;
    }
    const result = await getActiveReservationsForRoom(activeRoomId);
    setPaymentReservationAmount(result.ok ? result.data[0]?.totalPrice : undefined);
  }, [activeRoomId]);

  const handlePaymentSubmit = useCallback(
    async (data: { type: "base" | "extra"; amount: number; reason: string }) => {
      if (!activeRoomId) return;
      if (data.type !== "extra" && isPaymentAlreadyPaid) {
        setSendError("이미 결제된 예약입니다. 추가금 요청을 이용해주세요.");
        return;
      }
      if (data.type === "extra" && !isPaymentAlreadyPaid) {
        setSendError("기본 결제가 완료된 후 추가금 요청을 보낼 수 있습니다.");
        return;
      }
      try {
        const deadline = getPaymentDeadline();
        const isExtra = data.type === "extra";
        const reservationId = isExtra
          ? (selectedRoom?.reservationId ?? (selectedRoom?.sitterId ? await getActiveReservationBySitter(selectedRoom.sitterId, { includePaid: true }) : null))
          : undefined;
        const result = await sendPaymentRequestMessage(
          activeRoomId,
          { amount: data.amount, reason: data.reason, deadline, isExtra },
          reservationId ?? undefined,
        );
        if (!result.ok) {
          setSendError(result.error);
          return;
        }
        deliverMessage(activeRoomId, toRow(result.data));
        updatePreview(activeRoomId, "결제 요청", result.data.created_at ?? new Date().toISOString());
      } catch {
        setSendError("결제 요청 전송에 실패했습니다. 다시 시도해주세요.");
      }
    },
    [activeRoomId, isPaymentAlreadyPaid, selectedRoom, deliverMessage, updatePreview, setSendError],
  );

  const handlePayNow = useCallback(
    async (data: { amount: number; reason: string; messageId: string; extraChargeId?: string }) => {
      if (payingNow || isPaymentPending || !activeRoomId) return;

      const totalAmount = Number(data.amount);
      if (!totalAmount || totalAmount <= 0) return;

      setPayingNow(true);

      let portonePaymentId = `pay_${Date.now()}`;
      let orderName = data.reason || "서비스 결제";
      let chargeAmount = totalAmount;

      if (data.extraChargeId) {
        const extraResult = await createExtraPayment(data.extraChargeId);
        if (!extraResult.ok) {
          setSendError(extraResult.error);
          setPayingNow(false);
          return;
        }
        portonePaymentId = extraResult.paymentId;
        orderName = extraResult.orderName;
        chargeAmount = extraResult.amount;
      } else {
        const reservationId = selectedRoom?.reservationId ?? (selectedRoom?.sitterId ? await getActiveReservationBySitter(selectedRoom.sitterId) : null);

        if (!reservationId) {
          setSendError("예약 정보를 찾을 수 없습니다.");
          setPayingNow(false);
          return;
        }

        const payResult = await createPayment(reservationId, "CARD");
        if (!payResult.ok) {
          setSendError(payResult.error);
          setPayingNow(false);
          return;
        }
        portonePaymentId = payResult.paymentId;
        orderName = payResult.orderName;
        chargeAmount = payResult.amount;
      }

      requestPayment(
        {
          paymentId: portonePaymentId,
          orderName,
          totalAmount: chargeAmount,
          currency: "KRW",
          payMethod: "CARD",
          redirectUrl: `${window.location.origin}/payment/complete`,
        },
        {
          onSuccess: async () => {
            try {
              const verifyResult = await verifyAndConfirmPayment(portonePaymentId);
              if (!verifyResult.ok) {
                setSendError(verifyResult.error);
                return;
              }
              const result = await sendPaymentCompleteMessage(activeRoomId, {
                amount: chargeAmount,
                paymentRequestMessageId: data.messageId,
              });
              if (result.ok) {
                deliverMessage(activeRoomId, toRow(result.data));
                updatePreview(activeRoomId, "결제 완료", result.data.created_at ?? new Date().toISOString());
              }
            } finally {
              setPayingNow(false);
            }
          },
          onFail: async (message) => {
            await cancelPendingPayment(portonePaymentId);
            setSendError(message ?? "결제에 실패했습니다. 다시 시도해주세요.");
            setPayingNow(false);
          },
        },
      );
    },
    [payingNow, isPaymentPending, activeRoomId, selectedRoom, requestPayment, deliverMessage, updatePreview, setSendError],
  );

  return {
    paymentModalOpen,
    paymentReservationAmount,
    payingNow,
    closePaymentModal,
    handleOpenPaymentModal,
    handlePaymentSubmit,
    handlePayNow,
  };
}
