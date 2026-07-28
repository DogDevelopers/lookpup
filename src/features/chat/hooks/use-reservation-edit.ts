import { useCallback, useState } from "react";
import { sendReservationEditMessage, sendReservationEditResponseMessage } from "@/features/chat/actions/reservation-edit-message-actions";
import { updateReservationDetails } from "@/features/reservations/actions";
import { toRow } from "@/features/chat/utils";
import type { ChatMessageRow, ReservationEditActionState } from "@/features/chat/types";

type EditPayload = { start_datetime: string; end_datetime: string; memo?: string | null };

export function useReservationEdit(
  activeRoomId: string | null,
  deliverMessage: (roomId: string, message: ChatMessageRow) => void,
  updatePreview: (roomId: string, text: string, time: string) => void,
  refresh: () => void,
  setSendError: (error: string | null) => void,
) {
  const [reservationEditOpen, setReservationEditOpen] = useState(false);
  const [reservationEditAction, setReservationEditAction] = useState<ReservationEditActionState>(null);

  const openReservationEdit = useCallback(() => setReservationEditOpen(true), []);
  const closeReservationEdit = useCallback(() => setReservationEditOpen(false), []);

  const handleReservationEditSubmit = useCallback(
    async (reservationId: string, proposed: EditPayload, original: EditPayload) => {
      if (!activeRoomId) return;
      try {
        const result = await sendReservationEditMessage(activeRoomId, { reservationId, original, proposed });
        if (!result.ok) {
          setSendError(result.error);
          return;
        }
        deliverMessage(activeRoomId, toRow(result.data));
        updatePreview(activeRoomId, "예약 수정 요청", result.data.created_at ?? new Date().toISOString());
      } catch {
        setSendError("예약 수정 요청 전송에 실패했습니다. 다시 시도해주세요.");
      }
    },
    [activeRoomId, deliverMessage, updatePreview, setSendError],
  );

  const handleReservationEditConfirm = useCallback(
    async (messageId: string, reservationId: string, proposed: EditPayload) => {
      if (!activeRoomId || reservationEditAction) return;
      setReservationEditAction({ messageId, type: "confirm" });
      try {
        const updateResult = await updateReservationDetails(reservationId, proposed);
        if (!updateResult.ok) {
          setSendError(updateResult.error);
          return;
        }
        const result = await sendReservationEditResponseMessage(activeRoomId, { originalMessageId: messageId, accepted: true });
        if (!result.ok) {
          setSendError(result.error);
          return;
        }
        deliverMessage(activeRoomId, toRow(result.data));
        updatePreview(activeRoomId, "예약 수정 승인", result.data.created_at ?? new Date().toISOString());
        refresh();
      } catch {
        setSendError("예약 수정에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setReservationEditAction(null);
      }
    },
    [activeRoomId, reservationEditAction, deliverMessage, updatePreview, refresh, setSendError],
  );

  const handleReservationEditReject = useCallback(
    async (messageId: string) => {
      if (!activeRoomId || reservationEditAction) return;
      setReservationEditAction({ messageId, type: "reject" });
      try {
        const result = await sendReservationEditResponseMessage(activeRoomId, { originalMessageId: messageId, accepted: false });
        if (!result.ok) {
          setSendError(result.error);
          return;
        }
        deliverMessage(activeRoomId, toRow(result.data));
        updatePreview(activeRoomId, "예약 수정 거절", result.data.created_at ?? new Date().toISOString());
      } catch {
        setSendError("예약 수정 거절 전송에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setReservationEditAction(null);
      }
    },
    [activeRoomId, reservationEditAction, deliverMessage, updatePreview, setSendError],
  );

  return {
    reservationEditOpen,
    reservationEditAction,
    openReservationEdit,
    closeReservationEdit,
    handleReservationEditSubmit,
    handleReservationEditConfirm,
    handleReservationEditReject,
  };
}
