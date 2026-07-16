"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import { CustomModal } from "@/components/common/CustomModal";
import {
  ProfilePopup,
  type ProfilePopupData,
  type Badge,
  type Message,
  type ReservationEditActionState,
  canLeaveDirectRoom,
  canLeaveReservationRequest,
} from "./chat_components";
import { ReservationConfirmModal, type ReservationDetails } from "./ReservationConfirmModal";
import { ServiceCompleteModal, type ActiveReservation } from "./ServiceCompleteModal";
import { PaymentRequestModal } from "./PaymentRequestModal";
import CareRecordModal, { type CareRecordModalPayload } from "./CareRecordModal";
import ReservationEditModal from "./ReservationEditModal";
import { useChatRooms } from "../hooks/use-chat-rooms";
import { useChatMessages } from "../hooks/use-chat-messages";
import { useRequest } from "../hooks/use-request";
import { usePortOne } from "@/hooks/use-portone";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  sendMessage,
  sendImageMessage,
  markRoomRead,
  sendSystemMessage,
  sendPaymentRequestMessage,
  sendAutoPaymentRequestMessage,
  sendPaymentCompleteMessage,
  sendApplicationSelectedMessage,
  sendApplicationRejectedMessage,
  sendServiceCompleteMessage,
  sendServiceStartMessage,
  sendReservationEditMessage,
  sendReservationEditResponseMessage,
} from "@/features/chat/actions";
import type { RoomApiItem, ChatMessageRow } from "@/features/chat/types";
import {
  ownerConfirmServiceComplete,
  getActiveReservationsForRoom,
  getReadyReservationsForRoom,
  getReservationStatuses,
  acceptReservationRequest,
  rejectReservationRequest,
  sitterStartService,
  getReservationRequestDetails,
  updateReservationDetails,
} from "@/features/reservations/actions";
import { getReviewedReservationIds } from "@/features/reviews/actions";
import { updateApplicationByRoom, getRequestDetailsForReservation } from "@/features/applications/actions";
import {
  createPayment,
  createExtraPayment,
  getActiveReservationBySitter,
  verifyAndConfirmPayment,
  cancelPendingPayment,
} from "@/features/payments/actions";
import { createCareRecord, getInProgressReservationByOwnerAndSitter } from "@/features/care-records/actions";
import { RESERVATION_STATUS, APPLICATION_STATUS } from "@/lib/constants";

type Tab = "one_on_one" | "reservations" | "applicants";

type RawMessageRow = { id: string; sender_id: string; content: string; created_at: string | null };

function toRow(m: RawMessageRow): ChatMessageRow {
  return { id: m.id, sender_id: m.sender_id, content: m.content, is_read: false, created_at: m.created_at ?? new Date().toISOString() };
}

function getPaymentDeadline() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function withDateSeparators(msgs: Message[]): Message[] {
  const result: Message[] = [];
  let lastDateKey: string | null = null;
  for (const msg of msgs) {
    if (msg.rawDate) {
      const d = new Date(msg.rawDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (key !== lastDateKey) {
        const label = d.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        });
        result.push({ id: `__date_${key}__`, from: "date_separator", text: label });
        lastDateKey = key;
      }
    }
    result.push(msg);
  }
  return result;
}

function ChatPageContent({
  initialTab,
  initialRoomId,
  initialRoomsData,
}: {
  initialTab: Tab;
  initialRoomId?: string | null;
  initialRoomsData?: RoomApiItem[];
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [selectedReservationRequestId, setSelectedReservationRequestId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const [payingNow, setPayingNow] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const isLoadMoreRef = useRef(false);
  const scrollAnchorRef = useRef<number | null>(null);
  const desktopScrollAnchorRef = useRef<number | null>(null);
  const prevApplicantStatusRef = useRef<string | null | undefined>(null);

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

  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);

  const [mobileChatView, setMobileChatView] = useState<"list" | "room">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const hasAutoSelected = useRef(false);
  const hasRetried = useRef(false);
  const prevInitialRoomId = useRef<string | null | undefined>(null);

  const [profilePopup, setProfilePopup] = useState<{
    data: ProfilePopupData;
    cardVariant: "sitter" | "owner";
  } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentReservationAmount, setPaymentReservationAmount] = useState<number | undefined>(undefined);
  const [careRecordOpen, setCareRecordOpen] = useState(false);
  const [confirmedServiceIds, setConfirmedServiceIds] = useState<Set<string>>(new Set());
  const checkedReservationIdsRef = useRef(new Set<string>());
  const [reviewedReservationIds, setReviewedReservationIds] = useState<Set<string>>(new Set());
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

  const [reservationEditOpen, setReservationEditOpen] = useState(false);
  const [reservationEditAction, setReservationEditAction] = useState<ReservationEditActionState>(null);

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    type: "room" | "applicant" | "reservation";
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const activeRoomId =
    activeTab === "one_on_one"
      ? selectedRoomId
      : activeTab === "reservations"
        ? selectedReservationRequestId
        : selectedApplicantId;

  const {
    rooms,
    applicants,
    reservationRequests,
    posts,
    loading,
    error,
    userId,
    deleteRoom,
    deleteApplicant,
    deleteReservationRequest,
    markRoomAsRead,
    updatePreview,
    updateApplicantStatus,
    updateReservationRequestStatus,
    refresh,
    acceptedDirectRoomId,
    clearAcceptedDirectRoomId,
  } = useChatRooms(activeRoomId, initialRoomsData);

  const { rejectedIds, confirmedIds, rejectApplicant, confirmApplicant, getApplicantBadge } = useRequest(applicants);

  const {
    messages: rawMessages,
    addMessage,
    broadcastMessage,
    broadcastConfirmation,
    broadcastReservationAccepted,
    loadMore,
    hasMore,
    loadingMore,
    paymentState,
    confirmedEditIds,
  } = useChatMessages(activeRoomId, userId, messagesRefreshKey);

  const messages = useMemo(() => withDateSeparators(rawMessages), [rawMessages]);

  const { requestPayment, isPending: isPaymentPending } = usePortOne();

  const activeRoomIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  const deliverMessage = useCallback(
    (roomId: string, message: ChatMessageRow) => {
      if (activeRoomIdRef.current === roomId) addMessage(message);
      broadcastMessage(roomId, message);
    },
    [addMessage, broadcastMessage],
  );

  const selectedRoom = selectedRoomId !== null ? rooms.find((r) => r.id === selectedRoomId) : undefined;
  const selectedApplicant = applicants.find((a) => a.id === selectedApplicantId);
  const selectedReservationRequest = selectedReservationRequestId
    ? reservationRequests.find((rr) => rr.id === selectedReservationRequestId)
    : undefined;

  const isPaymentComplete = paymentState?.paid === true;
  const isPaymentAlreadyPaid =
    isPaymentComplete ||
    selectedRoom?.reservationStatus === RESERVATION_STATUS.PAID ||
    selectedRoom?.reservationStatus === RESERVATION_STATUS.IN_PROGRESS ||
    selectedRoom?.reservationStatus === RESERVATION_STATUS.COMPLETED;
  const hasServiceStarted = useMemo(() => rawMessages.some((m) => m.from === "service_start"), [rawMessages]);
  const hasServiceCompleted = useMemo(() => rawMessages.some((m) => m.from === "service_complete"), [rawMessages]);

  const [prevActiveRoomId, setPrevActiveRoomId] = useState(activeRoomId);
  if (activeRoomId !== prevActiveRoomId) {
    setPrevActiveRoomId(activeRoomId);
    if (activeRoomId) {
      setSendError(null);
      setInput("");
      setConfirmedServiceIds(new Set());
      setReviewedReservationIds(new Set());
    }
  }

  useEffect(() => {
    if (!activeRoomId) return;
    markRoomAsRead(activeRoomId);
    markRoomRead(activeRoomId);
    checkedReservationIdsRef.current = new Set();
    checkedReviewReservationIdsRef.current = new Set();
  }, [activeRoomId, markRoomAsRead]);

  useLayoutEffect(() => {
    if (isLoadMoreRef.current) {
      isLoadMoreRef.current = false;
      const mobileEl = mobileScrollRef.current;
      if (scrollAnchorRef.current !== null && mobileEl) {
        mobileEl.scrollTop += mobileEl.scrollHeight - scrollAnchorRef.current;
        scrollAnchorRef.current = null;
      } else {
        const viewport = messagesEndRef.current?.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
        if (viewport && desktopScrollAnchorRef.current !== null) {
          viewport.scrollTop += viewport.scrollHeight - desktopScrollAnchorRef.current;
          desktopScrollAnchorRef.current = null;
        }
      }
      return;
    }
    const mobileEl = mobileScrollRef.current;
    if (mobileEl && mobileEl.offsetParent !== null) {
      mobileEl.scrollTop = mobileEl.scrollHeight;
      return;
    }
    const viewport = messagesEndRef.current?.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (prevInitialRoomId.current !== initialRoomId) {
      prevInitialRoomId.current = initialRoomId;
      hasAutoSelected.current = false;
      hasRetried.current = false;
    }
    if (!initialRoomId || hasAutoSelected.current || loading) return;
    const room = rooms.find((r) => r.id === initialRoomId);
    if (room) {
      hasAutoSelected.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab("one_on_one");
      setSelectedRoomId(room.id);
      setMobileChatView("room");
      return;
    }
    const applicant = applicants.find((a) => a.id === initialRoomId);
    if (applicant) {
      hasAutoSelected.current = true;
      setActiveTab("applicants");
      setSelectedApplicantId(applicant.id);
      setMobileChatView("room");
      return;
    }
    const rr = reservationRequests.find((r) => r.id === initialRoomId);
    if (rr) {
      hasAutoSelected.current = true;
      setActiveTab("reservations");
      setSelectedReservationRequestId(rr.id);
      setMobileChatView("room");
      return;
    }
    if (!hasRetried.current) {
      hasRetried.current = true;
      refresh();
    }
  }, [initialRoomId, rooms, applicants, reservationRequests, loading, refresh]);

  useEffect(() => {
    if (!acceptedDirectRoomId) return;
    clearAcceptedDirectRoomId();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab("one_on_one");
    setSelectedRoomId(acceptedDirectRoomId);
    setSelectedReservationRequestId(null);
    setMobileChatView("room");
  }, [acceptedDirectRoomId, clearAcceptedDirectRoomId]);

  useEffect(() => {
    const currentStatus = selectedApplicant?.applicationStatus;
    const prevStatus = prevApplicantStatusRef.current;
    prevApplicantStatusRef.current = currentStatus;

    if (prevStatus !== APPLICATION_STATUS.ACCEPTED && currentStatus === APPLICATION_STATUS.ACCEPTED && selectedApplicantId) {
      setMessagesRefreshKey((k) => k + 1);
    }
  }, [selectedApplicant?.applicationStatus, selectedApplicantId]);

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
  }, [pendingAcceptRoomId, reservationRequests, actioningId, broadcastReservationAccepted, refresh]);

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
    [reservationRequests, actioningId, updateReservationRequestStatus, addMessage],
  );

  const handleDeleteReservationRequest = useCallback(
    (id: string) => {
      const rr = reservationRequests.find((r) => r.id === id);
      if (rr && !canLeaveReservationRequest(rr)) return;
      setPendingDelete({ id, type: "reservation" });
      setDeleteError(null);
    },
    [reservationRequests],
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
    [pendingConfirmId, actioningId, confirmApplicant, updateApplicantStatus, broadcastConfirmation, applicants, posts, deliverMessage, updatePreview, broadcastReservationAccepted],
  );

  const handleLoadMore = useCallback(() => {
    const mobileEl = mobileScrollRef.current;
    if (mobileEl && mobileEl.offsetParent !== null) {
      scrollAnchorRef.current = mobileEl.scrollHeight;
    } else {
      const viewport = messagesEndRef.current?.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
      if (viewport) desktopScrollAnchorRef.current = viewport.scrollHeight;
    }
    isLoadMoreRef.current = true;
    loadMore();
  }, [loadMore]);

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
    [activeRoomId, isPaymentAlreadyPaid, selectedRoom, deliverMessage, updatePreview],
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
    [payingNow, isPaymentPending, activeRoomId, selectedRoom, requestPayment, deliverMessage, updatePreview],
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeRoomId || sending) return;
    setSendError(null);
    setSending(true);
    try {
      const result = await sendMessage(activeRoomId, input.trim());
      if (!result.ok) {
        setSendError(result.error);
        return;
      }
      deliverMessage(activeRoomId, toRow(result.data));
      updatePreview(activeRoomId, result.data.content, result.data.created_at ?? new Date().toISOString());
      setInput("");
    } catch {
      setSendError("메시지 전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  }, [input, activeRoomId, sending, deliverMessage, updatePreview]);

  const handlePhotoSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !activeRoomId || sendingPhoto) return;
      if (file.size > 10 * 1024 * 1024) {
        setSendError("10MB 이하의 이미지만 전송할 수 있습니다.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setSendError("이미지 파일만 전송할 수 있습니다.");
        return;
      }
      setSendError(null);
      setSendingPhoto(true);
      try {
        const imageUrl = await uploadToCloudinary(file, "chats/photos");
        const result = await sendImageMessage(activeRoomId, imageUrl);
        if (!result.ok) {
          setSendError(result.error);
          return;
        }
        deliverMessage(activeRoomId, toRow(result.data));
        updatePreview(activeRoomId, "사진", result.data.created_at ?? new Date().toISOString());
      } catch {
        setSendError("사진 전송에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setSendingPhoto(false);
      }
    },
    [activeRoomId, sendingPhoto, deliverMessage, updatePreview],
  );

  const handleCareRecordSubmit = async (record: CareRecordModalPayload) => {
    if (!activeRoomId) return;
    try {
      let reservationId = record.reservationId;

      if (!reservationId && selectedRoom?.ownerId && selectedRoom?.sitterId) {
        const res = await getInProgressReservationByOwnerAndSitter(selectedRoom.ownerId, selectedRoom.sitterId);
        if (res.ok) reservationId = res.data.id;
      }

      if (reservationId) {
        await createCareRecord({
          reservationId,
          type: record.type,
          serviceType: record.serviceType ?? null,
          title: record.title,
          statusText: record.statusText,
          content: record.content,
          fields: record.fields,
          imageUrls: record.imageUrls,
        });
      }

      const content = `[돌봄기록] ${record.title}`;
      const result = await sendSystemMessage(activeRoomId, content);
      if (result.ok) {
        deliverMessage(activeRoomId, toRow(result.data));
        updatePreview(activeRoomId, content, result.data.created_at ?? new Date().toISOString());
      }
    } catch {
      setSendError("돌봄기록 전송에 실패했습니다. 다시 시도해주세요.");
    }
  };

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

  async function handleReservationEditSubmit(
    reservationId: string,
    proposed: { start_datetime: string; end_datetime: string; memo?: string | null },
    original: { start_datetime: string; end_datetime: string; memo?: string | null },
  ) {
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
  }

  const handleReservationEditConfirm = useCallback(
    async (messageId: string, reservationId: string, proposed: { start_datetime: string; end_datetime: string; memo?: string | null }) => {
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
    [activeRoomId, reservationEditAction, deliverMessage, updatePreview, refresh],
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
    [activeRoomId, reservationEditAction, deliverMessage, updatePreview],
  );

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

  const handleWriteReview = useCallback(
    (reservationId: string) => {
      router.push(`/myprofile/reviews/write?bookingId=${reservationId}`);
    },
    [router],
  );

  const openApplicantProfile = useCallback(
    (id: string) => {
      const a = applicants.find((a) => a.id === id);
      if (!a) return;
      setProfilePopup({
        data: {
          sitterId: a.sitterId,
          name: a.name,
          initial: a.initial,
          profileImage: a.profileImage,
          location: a.location,
          rating: a.rating,
          reviewCount: a.reviewCount,
          services: a.services,
          career: a.experience,
        },
        cardVariant: a.ownerId === userId ? "sitter" : "owner",
      });
    },
    [applicants, userId],
  );

  const openReservationProfile = useCallback(
    (id: string) => {
      const r = reservationRequests.find((r) => r.id === id);
      if (!r) return;
      setProfilePopup({
        data: { sitterId: r.sitterId, name: r.name, initial: r.initial, profileImage: r.profileImage },
        cardVariant: r.ownerId === userId ? "sitter" : "owner",
      });
    },
    [reservationRequests, userId],
  );

  const handleDeleteRoom = useCallback(
    (id: string) => {
      const room = rooms.find((r) => r.id === id);
      if (room && !canLeaveDirectRoom(room)) return;
      setPendingDelete({ id, type: "room" });
      setDeleteError(null);
    },
    [rooms],
  );

  const handleDeleteApplicant = useCallback((id: string) => {
    setPendingDelete({ id, type: "applicant" });
    setDeleteError(null);
  }, []);

  async function handleConfirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result =
        pendingDelete.type === "room"
          ? await deleteRoom(pendingDelete.id)
          : pendingDelete.type === "reservation"
            ? await deleteReservationRequest(pendingDelete.id)
            : await deleteApplicant(pendingDelete.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      if (pendingDelete.type === "room" && selectedRoomId === pendingDelete.id) {
        setSelectedRoomId(null);
        setMobileChatView("list");
      }
      if (pendingDelete.type === "reservation" && selectedReservationRequestId === pendingDelete.id) {
        setSelectedReservationRequestId(null);
        setMobileChatView("list");
      }
      if (pendingDelete.type === "applicant" && selectedApplicantId === pendingDelete.id) {
        setSelectedApplicantId(null);
        setMobileChatView("list");
      }
      setPendingDelete(null);
    } catch {
      setDeleteError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setDeleting(false);
    }
  }

  const handleGoToChat = useCallback(
    (isMobile: boolean) => {
      const room = rooms.find((r) => r.ownerId === selectedApplicant?.ownerId && r.sitterId === selectedApplicant?.sitterId);
      setActiveTab("one_on_one");
      setSelectedApplicantId(null);
      if (room) setSelectedRoomId(room.id);
      if (isMobile) setMobileChatView(room ? "room" : "list");
    },
    [rooms, selectedApplicant],
  );

  const handleGoToChatMobile = useCallback(() => handleGoToChat(true), [handleGoToChat]);
  const handleGoToChatDesktop = useCallback(() => handleGoToChat(false), [handleGoToChat]);

  const leaveChat = useCallback(() => {
    if (activeTab === "one_on_one" && selectedRoomId !== null) handleDeleteRoom(selectedRoomId);
    else if (activeTab === "reservations" && selectedReservationRequestId !== null) handleDeleteReservationRequest(selectedReservationRequestId);
    else if (activeTab === "applicants" && selectedApplicantId !== null) handleDeleteApplicant(selectedApplicantId);
  }, [activeTab, selectedRoomId, selectedReservationRequestId, selectedApplicantId, handleDeleteRoom, handleDeleteReservationRequest, handleDeleteApplicant]);

  const handleNavigateToPost = useCallback((postId: string) => router.push(`/board/${postId}`), [router]);

  const handleRejectSelectedApplicant = useCallback(() => handleRejectApplicant(selectedApplicantId!), [handleRejectApplicant, selectedApplicantId]);
  const handleConfirmSelectedApplicant = useCallback(() => handleConfirmClick(selectedApplicantId!), [handleConfirmClick, selectedApplicantId]);

  const handleMobileTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setMobileChatView("list");
  }, []);
  const handleMobileRoomSelect = useCallback((id: string) => {
    setSelectedRoomId(id);
    setMobileChatView("room");
  }, []);
  const handleMobileApplicantSelect = useCallback((id: string) => {
    setSelectedApplicantId(id);
    setMobileChatView("room");
  }, []);
  const handleMobileReservationSelect = useCallback((id: string) => {
    setSelectedReservationRequestId(id);
    setMobileChatView("room");
  }, []);
  const handleBackToList = useCallback(() => setMobileChatView("list"), []);

  const activeItem = activeTab === "one_on_one" ? selectedRoom : activeTab === "reservations" ? selectedReservationRequest : selectedApplicant;

  const handleGoToProfile = useCallback(() => {
    if (!activeItem || !userId || activeItem.ownerId !== userId) return;
    if (activeItem.sitterId && activeRoomId) router.push(`/petsitters/${activeItem.sitterId}?from=chat&roomId=${activeRoomId}`);
  }, [activeItem, activeRoomId, userId, router]);

  function getHeaderBadge(): Badge {
    if (activeTab === "one_on_one") return { label: "진행중", className: "bg-orange-50 text-orange-500" };
    if (activeTab === "reservations") {
      const status = selectedReservationRequest?.reservationStatus;
      if (status === RESERVATION_STATUS.CANCELED) return { label: "거절됨", className: "bg-stone-100 text-stone-500" };
      if (status === RESERVATION_STATUS.ACCEPTED) return { label: "확정됨", className: "bg-green-50 text-green-600" };
      return { label: "대기 중", className: "bg-orange-50 text-orange-400" };
    }
    if (selectedApplicantId !== null && rejectedIds.has(selectedApplicantId)) return { label: "거절됨", className: "bg-stone-100 text-stone-500" };
    if (confirmedIds.get(selectedApplicant?.postId ?? "") === selectedApplicantId) return { label: "선택됨", className: "bg-green-50 text-green-700" };
    return { label: "채팅중", className: "bg-orange-50 text-orange-500" };
  }

  const getHeaderSub = useCallback(() => {
    if (activeTab === "one_on_one") return selectedRoom?.sub ?? "";
    if (activeTab === "reservations") {
      const status = selectedReservationRequest?.reservationStatus;
      if (status === RESERVATION_STATUS.ACCEPTED) return "예약 요청 · 확정됨";
      if (status === RESERVATION_STATUS.CANCELED) return "예약 요청 · 거절됨";
      return "예약 요청 · 대기 중";
    }
    if (confirmedIds.get(selectedApplicant?.postId ?? "") === selectedApplicantId) return "구인글 채팅 · 선택됨";
    if (selectedApplicantId !== null && rejectedIds.has(selectedApplicantId)) return "구인글 채팅 · 거절됨";
    return "구인글 채팅 · 지원자";
  }, [activeTab, selectedRoom, selectedReservationRequest, confirmedIds, selectedApplicant, selectedApplicantId, rejectedIds]);

  const getReportUrl = useCallback(() => {
    let targetId = "";
    let targetName = "";
    let targetImage: string | null = null;
    let role = "펫시터";

    if (activeTab === "one_on_one") {
      const isUserSitter = selectedRoom?.sitterId === userId;
      targetId = isUserSitter ? (selectedRoom?.ownerId ?? "") : (selectedRoom?.sitterId ?? "");
      targetName = selectedRoom?.name ?? "";
      targetImage = selectedRoom?.profileImage ?? null;
      role = isUserSitter ? "보호자" : "펫시터";
    } else if (activeTab === "reservations") {
      const isUserOwner = selectedReservationRequest?.ownerId === userId;
      targetId = isUserOwner ? (selectedReservationRequest?.sitterId ?? "") : (selectedReservationRequest?.ownerId ?? "");
      targetName = selectedReservationRequest?.name ?? "";
      targetImage = selectedReservationRequest?.profileImage ?? null;
      role = isUserOwner ? "펫시터" : "보호자";
    } else {
      const isUserSitter = selectedApplicant?.sitterId === userId;
      targetId = isUserSitter ? (selectedApplicant?.ownerId ?? "") : (selectedApplicant?.sitterId ?? "");
      targetName = isUserSitter ? "" : (selectedApplicant?.name ?? "");
      targetImage = isUserSitter ? null : (selectedApplicant?.profileImage ?? null);
      role = isUserSitter ? "보호자" : "펫시터";
    }

    const service = getHeaderSub();
    const params = new URLSearchParams();
    if (targetId) params.set("targetId", targetId);
    if (targetName) params.set("targetName", targetName);
    params.set("role", role);
    if (service) params.set("service", service);
    if (targetImage) params.set("targetImage", targetImage);
    return `/myprofile/report?${params.toString()}`;
  }, [activeTab, selectedRoom, selectedReservationRequest, selectedApplicant, userId, getHeaderSub]);

  const handleReport = useCallback(() => router.push(getReportUrl()), [router, getReportUrl]);

  const roomName = activeTab === "one_on_one" ? (selectedRoom?.name ?? "") : activeTab === "reservations" ? (selectedReservationRequest?.name ?? "") : (selectedApplicant?.name ?? "");
  const roomInitial = activeTab === "one_on_one" ? (selectedRoom?.initial ?? "") : activeTab === "reservations" ? (selectedReservationRequest?.initial ?? "") : (selectedApplicant?.initial ?? "");
  const roomProfileImage =
    activeTab === "one_on_one" ? (selectedRoom?.profileImage ?? null) : activeTab === "reservations" ? (selectedReservationRequest?.profileImage ?? null) : (selectedApplicant?.profileImage ?? null);
  const headerBadge = getHeaderBadge();
  const headerSub = getHeaderSub();

  const isCurrentUserSitter = userId !== null && activeTab === "one_on_one" && selectedRoom !== undefined && selectedRoom.ownerId !== null && selectedRoom.ownerId !== userId;

  const canStartService = !(selectedRoom?.reservationStatus && ["in_progress", "completed", "canceled"].includes(selectedRoom.reservationStatus));

  const isOwnerOfSelectedRoom = selectedApplicant?.ownerId !== null && selectedApplicant?.ownerId === userId;

  const showApplicantActions =
    activeTab === "applicants" &&
    selectedApplicantId !== null &&
    isOwnerOfSelectedRoom &&
    !rejectedIds.has(selectedApplicantId) &&
    confirmedIds.get(selectedApplicant?.postId ?? "") !== selectedApplicantId &&
    !confirmedIds.has(selectedApplicant?.postId ?? "");

  const isRejectedApplicant = activeTab === "applicants" && !isOwnerOfSelectedRoom && selectedApplicantId !== null && rejectedIds.has(selectedApplicantId);

  const isRecipientLeft =
    activeTab === "one_on_one" ? !!selectedRoom?.recipientLeft : activeTab === "applicants" ? !!selectedApplicant?.recipientLeft : activeTab === "reservations" ? !!selectedReservationRequest?.recipientLeft : false;

  const canLeaveActiveRoom =
    activeTab === "one_on_one"
      ? !selectedRoom || canLeaveDirectRoom(selectedRoom)
      : activeTab === "reservations"
        ? !selectedReservationRequest || canLeaveReservationRequest(selectedReservationRequest)
        : true;

  const filteredRooms = useMemo(() => rooms.filter((r) => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())), [rooms, searchQuery]);
  const filteredApplicants = useMemo(() => applicants.filter((a) => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())), [applicants, searchQuery]);
  const filteredPosts = useMemo(() => posts.filter((p) => filteredApplicants.some((a) => a.postId === p.id)), [posts, filteredApplicants]);
  const filteredReservationRequests = useMemo(
    () => reservationRequests.filter((rr) => !searchQuery || rr.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [reservationRequests, searchQuery],
  );

  const sharedSidebarProps = {
    activeTab,
    searchQuery,
    loading,
    error,
    userId,
    filteredRooms,
    filteredApplicants,
    filteredPosts,
    filteredReservationRequests,
    totalRoomCount: rooms.length,
    totalApplicantCount: applicants.length,
    totalReservationCount: reservationRequests.length,
    applicants,
    selectedRoomId,
    selectedApplicantId,
    selectedReservationRequestId,
    rejectedIds,
    confirmedIds,
    actioningId,
    getApplicantBadge,
    onSearchChange: setSearchQuery,
    onDeleteRoom: handleDeleteRoom,
    onDeleteApplicant: handleDeleteApplicant,
    onDeleteReservationRequest: handleDeleteReservationRequest,
    onRejectReservation: handleRejectReservation,
    onAcceptReservation: handleAcceptReservation,
    onRejectApplicant: handleRejectApplicant,
    onConfirm: handleConfirmClick,
    onAvatarClick: openApplicantProfile,
    onReservationAvatarClick: openReservationProfile,
  };

  const sharedChatWindowProps = {
    roomName,
    roomInitial,
    roomProfileImage,
    headerSub,
    headerBadge,
    activeTab,
    selectedApplicantPostId: selectedApplicant?.postId,
    messages,
    mobileScrollRef,
    messagesEndRef,
    hasMore,
    loadingMore,
    confirmedEditIds,
    reservationEditAction,
    confirmedServiceIds,
    reviewedReservationIds,
    payingNow,
    isPaymentPending,
    isServiceConfirming,
    isCurrentUserSitter,
    isPaymentComplete,
    hasServiceStarted,
    hasServiceCompleted,
    canLeaveChat: canLeaveActiveRoom,
    canViewProfile: !!selectedRoom && selectedRoom.ownerId === userId,
    canStartService,
    input,
    sending,
    sendError,
    isRejectedApplicant,
    isRecipientLeft,
    showApplicantActions,
    applicationActionError,
    actioningId,
    onLeaveChat: leaveChat,
    onWriteReview: handleWriteReview,
    onReport: handleReport,
    onNavigateToPost: handleNavigateToPost,
    onSetInput: setInput,
    onSend: handleSend,
    onLoadMore: handleLoadMore,
    onPayNow: handlePayNow,
    onOpenPaymentModal: handleOpenPaymentModal,
    onOpenCareRecord: () => setCareRecordOpen(true),
    onServiceStart: handleServiceStart,
    onServiceComplete: handleServiceComplete,
    onOpenReservationEdit: () => setReservationEditOpen(true),
    onPhotoClick: () => photoInputRef.current?.click(),
    onServiceConfirm: handleServiceConfirm,
    onReservationEditConfirm: handleReservationEditConfirm,
    onReservationEditReject: handleReservationEditReject,
    onRejectApplicant: handleRejectSelectedApplicant,
    onConfirmApplicant: handleConfirmSelectedApplicant,
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-[calc(100vh-64px)] bg-orange-50">
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        {mobileChatView === "list" ? (
          <ChatSidebar {...sharedSidebarProps} className="flex flex-col h-full" isMobile onTabChange={handleMobileTabChange} onRoomSelect={handleMobileRoomSelect} onApplicantSelect={handleMobileApplicantSelect} onReservationSelect={handleMobileReservationSelect} />
        ) : (
          <ChatWindow {...sharedChatWindowProps} isMobile loading={loading} error={error} isEmpty={false} hasSelection onBack={handleBackToList} onGoToProfile={handleGoToProfile} onGoToChat={handleGoToChatMobile} />
        )}
      </div>

      <div className="hidden md:flex flex-1 bg-white overflow-hidden">
        <ChatSidebar {...sharedSidebarProps} className="w-96 bg-white border-r border-orange-100 flex flex-col shrink-0" onTabChange={setActiveTab} onRoomSelect={setSelectedRoomId} onApplicantSelect={setSelectedApplicantId} onReservationSelect={setSelectedReservationRequestId} />
        <ChatWindow
          {...sharedChatWindowProps}
          isMobile={false}
          loading={loading}
          error={error}
          isEmpty={(activeTab === "one_on_one" && rooms.length === 0) || (activeTab === "applicants" && applicants.length === 0) || (activeTab === "reservations" && reservationRequests.length === 0)}
          hasSelection={!((activeTab === "one_on_one" && selectedRoomId === null) || (activeTab === "applicants" && selectedApplicantId === null) || (activeTab === "reservations" && selectedReservationRequestId === null))}
          onBack={() => {}}
          onGoToProfile={handleGoToProfile}
          onGoToChat={handleGoToChatDesktop}
        />
      </div>

      {profilePopup && <ProfilePopup data={profilePopup.data} cardVariant={profilePopup.cardVariant} onClose={() => setProfilePopup(null)} />}

      <CustomModal
        open={pendingDelete !== null}
        type="danger"
        title="채팅방을 나가시겠어요?"
        description={deleteError ?? "채팅방을 나가면 대화 내역을 다시 볼 수 없습니다."}
        confirmText={deleting ? "처리 중..." : "나가기"}
        cancelText="취소"
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <PaymentRequestModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        paymentAmount={paymentReservationAmount}
        isAlreadyPaid={isPaymentAlreadyPaid}
        onSubmit={handlePaymentSubmit}
      />

      <CareRecordModal
        open={careRecordOpen}
        onClose={() => setCareRecordOpen(false)}
        reservationId={selectedRoom?.reservationId ?? undefined}
        roomId={activeRoomId ?? undefined}
        senderId={userId ?? undefined}
        onSubmit={handleCareRecordSubmit}
      />

      <ReservationConfirmModal
        open={reservationModalOpen}
        sitterName={selectedApplicant?.name ?? ""}
        details={reservationDetails}
        loading={reservationModalLoading}
        confirming={actioningId === pendingConfirmId}
        onClose={() => setReservationModalOpen(false)}
        onConfirm={handleConfirmApplicant}
      />

      <ReservationConfirmModal
        open={acceptModalOpen}
        sitterName={selectedReservationRequest?.name ?? ""}
        details={acceptDetails}
        loading={acceptModalLoading}
        confirming={actioningId === pendingAcceptRoomId}
        hideEdit
        confirmLabel="수락"
        onClose={() => setAcceptModalOpen(false)}
        onConfirm={handleAcceptConfirm}
      />

      <ServiceCompleteModal
        open={serviceCompleteModalOpen}
        reservations={activeReservations}
        loading={serviceCompleteModalLoading}
        sending={serviceCompleteSending}
        variant="complete"
        onClose={() => setServiceCompleteModalOpen(false)}
        onConfirm={handleServiceCompleteConfirm}
      />

      <ServiceCompleteModal
        open={serviceStartModalOpen}
        reservations={readyReservations}
        loading={serviceStartModalLoading}
        sending={serviceStartSending}
        variant="start"
        onClose={() => setServiceStartModalOpen(false)}
        onConfirm={handleServiceStartConfirm}
      />

      {activeRoomId && (
        <ReservationEditModal open={reservationEditOpen} roomId={activeRoomId} onClose={() => setReservationEditOpen(false)} onSubmit={handleReservationEditSubmit} />
      )}
    </div>
  );
}

export default function ChatClient({ initialRoomsData }: { initialRoomsData?: RoomApiItem[] }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const roomId = searchParams.get("roomId");
  const initialTab: Tab = tab === "reservations" || tab === "applicants" ? tab : "one_on_one";

  return <ChatPageContent initialTab={initialTab} initialRoomId={roomId} initialRoomsData={initialRoomsData} />;
}
