import { useCallback, useState, type RefObject } from "react";
import { sendApplicationRejectedMessage, sendApplicationSelectedMessage } from "@/features/chat/actions/application-message-actions";
import { sendAutoPaymentRequestMessage } from "@/features/chat/actions/payment-message-actions";
import { acceptReservationRequest, rejectReservationRequest, getReservationRequestDetails } from "@/features/reservations/actions";
import { updateApplicationByRoom, getRequestDetailsForReservation } from "@/features/applications/actions";
import { toRow, getPaymentDeadline, type RawMessageRow } from "@/features/chat/utils";
import { RESERVATION_STATUS, APPLICATION_STATUS } from "@/lib/constants";
import type { ChatMessageRow, Applicant, ReservationRequest } from "@/features/chat/types";
import type { ReservationDetails } from "../components/ReservationConfirmModal";
import type { Post } from "./use-chat-rooms";

export function useApprovalActions(params: {
  reservationRequests: ReservationRequest[];
  applicants: Applicant[];
  posts: Post[];
  activeRoomIdRef: RefObject<string | null>;
  addMessage: (message: ChatMessageRow) => void;
  deliverMessage: (roomId: string, message: ChatMessageRow) => void;
  updatePreview: (roomId: string, text: string, time: string) => void;
  refresh: () => void;
  broadcastReservationAccepted: (roomId: string) => void;
  broadcastConfirmation: () => void;
  rejectApplicant: (id: string) => void;
  confirmApplicant: (id: string) => void;
  updateApplicantStatus: (roomId: string, status: string) => void;
  updateReservationRequestStatus: (roomId: string, status: string) => void;
  setActiveTab: (tab: "one_on_one" | "reservations" | "applicants") => void;
  setSelectedRoomId: (id: string | null) => void;
  setSelectedReservationRequestId: (id: string | null) => void;
  setSelectedApplicantId: (id: string | null) => void;
  setMobileChatView: (view: "list" | "room") => void;
  setMessagesRefreshKey: (updater: (k: number) => number) => void;
}) {
  const {
    reservationRequests,
    applicants,
    posts,
    activeRoomIdRef,
    addMessage,
    deliverMessage,
    updatePreview,
    refresh,
    broadcastReservationAccepted,
    broadcastConfirmation,
    rejectApplicant,
    confirmApplicant,
    updateApplicantStatus,
    updateReservationRequestStatus,
    setActiveTab,
    setSelectedRoomId,
    setSelectedReservationRequestId,
    setSelectedApplicantId,
    setMobileChatView,
    setMessagesRefreshKey,
  } = params;

  const [applicationActionError, setApplicationActionError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [reservationModalLoading, setReservationModalLoading] = useState(false);
  const [reservationDetails, setReservationDetails] = useState<ReservationDetails | null>(null);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);

  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [acceptModalLoading, setAcceptModalLoading] = useState(false);
  const [acceptDetails, setAcceptDetails] = useState<ReservationDetails | null>(null);
  const [pendingAcceptRoomId, setPendingAcceptRoomId] = useState<string | null>(null);

  const closeReservationModal = useCallback(() => setReservationModalOpen(false), []);
  const closeAcceptModal = useCallback(() => setAcceptModalOpen(false), []);

  const handleAcceptReservation = useCallback(
    async (roomId: string) => {
      const rr = reservationRequests.find((r) => r.id === roomId);
      if (!rr?.reservationId || actioningId) return;
      setPendingAcceptRoomId(roomId);
      setAcceptDetails(null);
      setAcceptModalOpen(true);
      setAcceptModalLoading(true);
      try {
        const result = await getReservationRequestDetails(rr.reservationId);
        if (result.ok) setAcceptDetails(result.data);
      } finally {
        setAcceptModalLoading(false);
      }
    },
    [reservationRequests, actioningId],
  );

  const handleAcceptConfirm = useCallback(async () => {
    const roomId = pendingAcceptRoomId;
    const rr = roomId ? reservationRequests.find((r) => r.id === roomId) : null;
    if (!rr?.reservationId || actioningId) return;
    setAcceptModalOpen(false);
    setActioningId(roomId);
    setApplicationActionError(null);
    try {
      const result = await acceptReservationRequest(rr.reservationId);
      if (!result.ok) {
        setApplicationActionError(result.error);
        return;
      }
      broadcastReservationAccepted(result.data.room_id);
      refresh();
      setActiveTab("one_on_one");
      setSelectedRoomId(result.data.room_id);
      setSelectedReservationRequestId(null);
      setMobileChatView("room");
      setMessagesRefreshKey((k) => k + 1);
    } catch {
      setApplicationActionError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setActioningId(null);
      setPendingAcceptRoomId(null);
    }
  }, [pendingAcceptRoomId, reservationRequests, actioningId, broadcastReservationAccepted, refresh, setActiveTab, setSelectedRoomId, setSelectedReservationRequestId, setMobileChatView, setMessagesRefreshKey]);

  const handleRejectReservation = useCallback(
    async (roomId: string) => {
      const rr = reservationRequests.find((r) => r.id === roomId);
      if (!rr?.reservationId || actioningId) return;
      setActioningId(roomId);
      setApplicationActionError(null);
      try {
        const result = await rejectReservationRequest(rr.reservationId);
        if (!result.ok) {
          setApplicationActionError(result.error);
          return;
        }
        updateReservationRequestStatus(roomId, RESERVATION_STATUS.CANCELED);
        const msg = result.data.message as RawMessageRow | null;
        if (msg && activeRoomIdRef.current === roomId) addMessage(toRow(msg));
      } catch {
        setApplicationActionError("오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setActioningId(null);
      }
    },
    [reservationRequests, actioningId, updateReservationRequestStatus, addMessage, activeRoomIdRef],
  );

  const handleRejectApplicant = useCallback(
    async (id: string) => {
      if (actioningId) return;
      setActioningId(id);
      setApplicationActionError(null);
      try {
        const result = await updateApplicationByRoom(id, "rejected");
        if (!result.ok) {
          setApplicationActionError(result.error);
          return;
        }
        rejectApplicant(id);
        const msgResult = await sendApplicationRejectedMessage(id);
        if (msgResult.ok) {
          deliverMessage(id, toRow(msgResult.data));
          updatePreview(id, "지원 거절", msgResult.data.created_at ?? new Date().toISOString());
        }
      } catch {
        setApplicationActionError("오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setActioningId(null);
      }
    },
    [actioningId, rejectApplicant, deliverMessage, updatePreview],
  );

  const handleConfirmClick = useCallback(
    async (id: string) => {
      if (actioningId) return;
      setPendingConfirmId(id);
      setReservationDetails(null);
      setReservationModalOpen(true);
      setReservationModalLoading(true);
      try {
        const result = await getRequestDetailsForReservation(id);
        if (!result.ok) {
          setApplicationActionError(result.error);
          setReservationModalOpen(false);
          return;
        }
        setReservationDetails(result.data);
      } catch {
        setApplicationActionError("오류가 발생했습니다. 다시 시도해주세요.");
        setReservationModalOpen(false);
      } finally {
        setReservationModalLoading(false);
      }
    },
    [actioningId],
  );

  const handleConfirmApplicant = useCallback(
    async (overrides: { startDatetime: string | null; endDatetime: string | null; totalPrice: number | null; location: string | null }) => {
      const id = pendingConfirmId;
      if (!id || actioningId) return;
      setReservationModalOpen(false);
      setActioningId(id);
      setApplicationActionError(null);
      try {
        const result = await updateApplicationByRoom(id, "accepted", overrides);
        if (!result.ok) {
          setApplicationActionError(result.error);
          return;
        }
        confirmApplicant(id);
        updateApplicantStatus(id, APPLICATION_STATUS.ACCEPTED);
        broadcastConfirmation();
        const confirmingApplicant = applicants.find((a) => a.id === id);
        const postTitle = confirmingApplicant ? (posts.find((p) => p.id === confirmingApplicant.postId)?.title ?? "") : "";
        const appData = {
          postTitle,
          postId: confirmingApplicant?.postId ?? "",
          sitterId: confirmingApplicant?.sitterId ?? "",
        };
        const msgResult = await sendApplicationSelectedMessage(id, appData);
        if (msgResult.ok) {
          deliverMessage(id, toRow(msgResult.data));
          updatePreview(id, "선택 확정", msgResult.data.created_at ?? new Date().toISOString());
        }

        // updateApplication이 이미 정확한 방(request_id 기준)을 direct로 전환하고
        // 그 id를 돌려주므로 그대로 쓴다(별도 재조회 없음).
        const newRoomId = result.data.roomId;
        if (newRoomId) {
          broadcastReservationAccepted(newRoomId);

          if (overrides.totalPrice && overrides.totalPrice > 0) {
            const deadline = getPaymentDeadline();
            const payResult = await sendAutoPaymentRequestMessage(newRoomId, {
              amount: overrides.totalPrice,
              reason: postTitle || "반려동물 정보",
              deadline,
              postId: confirmingApplicant?.postId,
            });
            if (payResult.ok) updatePreview(newRoomId, "결제 요청", payResult.data.created_at ?? new Date().toISOString());
          }

          setActiveTab("one_on_one");
          setSelectedRoomId(newRoomId);
          setSelectedApplicantId(null);
          setMobileChatView("room");
        }
      } catch {
        setApplicationActionError("오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setActioningId(null);
        setPendingConfirmId(null);
      }
    },
    [
      pendingConfirmId,
      actioningId,
      confirmApplicant,
      updateApplicantStatus,
      broadcastConfirmation,
      applicants,
      posts,
      deliverMessage,
      updatePreview,
      broadcastReservationAccepted,
      setActiveTab,
      setSelectedRoomId,
      setSelectedApplicantId,
      setMobileChatView,
    ],
  );

  return {
    applicationActionError,
    actioningId,
    reservationModalOpen,
    reservationModalLoading,
    reservationDetails,
    pendingConfirmId,
    acceptModalOpen,
    acceptModalLoading,
    acceptDetails,
    pendingAcceptRoomId,
    closeReservationModal,
    closeAcceptModal,
    handleAcceptReservation,
    handleAcceptConfirm,
    handleRejectReservation,
    handleRejectApplicant,
    handleConfirmClick,
    handleConfirmApplicant,
  };
}
