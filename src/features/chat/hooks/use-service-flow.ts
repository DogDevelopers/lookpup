import { useCallback, useEffect, useRef, useState } from "react";
import { sendServiceStartMessage, sendServiceCompleteMessage } from "@/features/chat/actions/service-message-actions";
import {
  getReadyReservationsForRoom,
  getActiveReservationsForRoom,
  getReservationStatuses,
  sitterStartService,
  ownerConfirmServiceComplete,
} from "@/features/reservations/actions";
import { getReviewedReservationIds } from "@/features/reviews/actions";
import { toRow, type RawMessageRow } from "@/features/chat/utils";
import { RESERVATION_STATUS } from "@/lib/constants";
import type { ChatMessageRow, Message } from "@/features/chat/types";
import type { ActiveReservation } from "../components/ServiceCompleteModal";

export function useServiceFlow(params: {
  activeRoomId: string | null;
  rawMessages: Message[];
  deliverMessage: (roomId: string, message: ChatMessageRow) => void;
  updatePreview: (roomId: string, text: string, time: string) => void;
  refresh: () => void;
  setSendError: (error: string | null) => void;
}) {
  const { activeRoomId, rawMessages, deliverMessage, updatePreview, refresh, setSendError } = params;

  const [confirmedServiceIds, setConfirmedServiceIds] = useState<Set<string>>(new Set());
  const [reviewedReservationIds, setReviewedReservationIds] = useState<Set<string>>(new Set());
  const checkedReservationIdsRef = useRef(new Set<string>());
  const checkedReviewReservationIdsRef = useRef(new Set<string>());
  const [isServiceConfirming, setIsServiceConfirming] = useState(false);
  const [serviceCompleteModalOpen, setServiceCompleteModalOpen] = useState(false);
  const [activeReservations, setActiveReservations] = useState<ActiveReservation[]>([]);
  const [serviceCompleteModalLoading, setServiceCompleteModalLoading] = useState(false);
  const [serviceCompleteSending, setServiceCompleteSending] = useState(false);
  const [serviceStartModalOpen, setServiceStartModalOpen] = useState(false);
  const [readyReservations, setReadyReservations] = useState<ActiveReservation[]>([]);
  const [serviceStartModalLoading, setServiceStartModalLoading] = useState(false);
  const [serviceStartSending, setServiceStartSending] = useState(false);

  const [prevActiveRoomId, setPrevActiveRoomId] = useState(activeRoomId);
  if (activeRoomId !== prevActiveRoomId) {
    setPrevActiveRoomId(activeRoomId);
    if (activeRoomId) {
      setConfirmedServiceIds(new Set());
      setReviewedReservationIds(new Set());
    }
  }

  useEffect(() => {
    if (!activeRoomId) return;
    checkedReservationIdsRef.current = new Set();
    checkedReviewReservationIdsRef.current = new Set();
  }, [activeRoomId]);

  useEffect(() => {
    const uncheckedIds = rawMessages
      .filter(
        (m) =>
          m.from === "service_complete" &&
          !m.sentByMe &&
          m.serviceCompleteData?.reservationId &&
          !checkedReservationIdsRef.current.has(m.serviceCompleteData.reservationId),
      )
      .map((m) => m.serviceCompleteData!.reservationId);

    if (uncheckedIds.length === 0) return;
    uncheckedIds.forEach((id) => checkedReservationIdsRef.current.add(id));

    getReservationStatuses(uncheckedIds).then((result) => {
      if (!result.ok) return;
      const completed = Object.entries(result.data)
        .filter(([, status]) => status === RESERVATION_STATUS.COMPLETED)
        .map(([id]) => id);
      if (completed.length > 0) setConfirmedServiceIds((prev) => new Set([...prev, ...completed]));
    });
  }, [rawMessages]);

  useEffect(() => {
    const uncheckedIds = rawMessages
      .filter(
        (m) =>
          m.from === "service_complete_confirmed" &&
          m.sentByMe &&
          m.serviceCompleteConfirmedData?.reservationId &&
          !checkedReviewReservationIdsRef.current.has(m.serviceCompleteConfirmedData.reservationId),
      )
      .map((m) => m.serviceCompleteConfirmedData!.reservationId);

    if (uncheckedIds.length === 0) return;
    uncheckedIds.forEach((id) => checkedReviewReservationIdsRef.current.add(id));

    getReviewedReservationIds(uncheckedIds).then((data) => {
      if (data.length === 0) return;
      setReviewedReservationIds((prev) => new Set([...prev, ...data]));
    });
  }, [rawMessages]);

  const closeServiceCompleteModal = useCallback(() => setServiceCompleteModalOpen(false), []);
  const closeServiceStartModal = useCallback(() => setServiceStartModalOpen(false), []);

  async function handleServiceStart() {
    if (!activeRoomId) return;
    setServiceStartModalLoading(true);
    setReadyReservations([]);
    setServiceStartModalOpen(true);
    try {
      const result = await getReadyReservationsForRoom(activeRoomId);
      if (!result.ok) {
        setServiceStartModalOpen(false);
        setSendError(result.error);
        return;
      }
      setReadyReservations(result.data);
    } catch {
      setServiceStartModalOpen(false);
      setSendError("예약 정보를 불러오는 데 실패했습니다.");
    } finally {
      setServiceStartModalLoading(false);
    }
  }

  async function handleServiceStartConfirm(reservationId: string) {
    if (!activeRoomId || serviceStartSending) return;
    setServiceStartSending(true);
    try {
      const startResult = await sitterStartService(reservationId);
      if (!startResult.ok) {
        setSendError(startResult.error);
        return;
      }
      const result = await sendServiceStartMessage(activeRoomId, reservationId);
      if (!result.ok) {
        setSendError(result.error);
        return;
      }
      deliverMessage(activeRoomId, toRow(result.data));
      updatePreview(activeRoomId, "서비스 시작", result.data.created_at ?? new Date().toISOString());
      refresh();
      setServiceStartModalOpen(false);
    } catch {
      setSendError("서비스 시작 전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setServiceStartSending(false);
    }
  }

  async function handleServiceComplete() {
    if (!activeRoomId) return;
    setServiceCompleteModalLoading(true);
    setActiveReservations([]);
    setServiceCompleteModalOpen(true);
    try {
      const result = await getActiveReservationsForRoom(activeRoomId);
      if (!result.ok) {
        setServiceCompleteModalOpen(false);
        setSendError(result.error);
        return;
      }
      setActiveReservations(result.data);
    } catch {
      setServiceCompleteModalOpen(false);
      setSendError("예약 정보를 불러오는데 실패했습니다.");
    } finally {
      setServiceCompleteModalLoading(false);
    }
  }

  async function handleServiceCompleteConfirm(reservationId: string) {
    if (!activeRoomId || serviceCompleteSending) return;
    setServiceCompleteSending(true);
    try {
      const result = await sendServiceCompleteMessage(activeRoomId, reservationId);
      if (!result.ok) {
        setSendError(result.error);
        return;
      }
      deliverMessage(activeRoomId, toRow(result.data));
      updatePreview(activeRoomId, "서비스 완료", result.data.created_at ?? new Date().toISOString());
      setServiceCompleteModalOpen(false);
    } catch {
      setSendError("서비스 완료 전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setServiceCompleteSending(false);
    }
  }

  async function handleServiceConfirm(reservationId: string) {
    if (!reservationId || isServiceConfirming || !activeRoomId) return;
    setIsServiceConfirming(true);
    try {
      const result = await ownerConfirmServiceComplete(reservationId);
      if (!result.ok) {
        setSendError(result.error);
        return;
      }
      setConfirmedServiceIds((prev) => new Set([...prev, reservationId]));
      const msg = result.data.completionMessage as RawMessageRow | null;
      if (msg) {
        deliverMessage(activeRoomId, toRow(msg));
        updatePreview(activeRoomId, "서비스 완료 확정", msg.created_at ?? new Date().toISOString());
      }
      refresh();
    } catch {
      setSendError("서비스 완료 확인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsServiceConfirming(false);
    }
  }

  return {
    confirmedServiceIds,
    reviewedReservationIds,
    isServiceConfirming,
    serviceCompleteModalOpen,
    activeReservations,
    serviceCompleteModalLoading,
    serviceCompleteSending,
    serviceStartModalOpen,
    readyReservations,
    serviceStartModalLoading,
    serviceStartSending,
    closeServiceCompleteModal,
    closeServiceStartModal,
    handleServiceStart,
    handleServiceStartConfirm,
    handleServiceComplete,
    handleServiceCompleteConfirm,
    handleServiceConfirm,
  };
}
