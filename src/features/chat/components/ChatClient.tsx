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
import { ProfilePopup } from "./ChatWindowHeader";
import { ReportDialog } from "@/features/report/components/ReportDialog";
import type { ReportCreateInput } from "@/features/report/schema";
import {
  canLeaveDirectRoom,
  canLeaveReservationRequest,
  toRow,
} from "@/features/chat/utils";
import { ReservationConfirmModal } from "./ReservationConfirmModal";
import { ServiceCompleteModal } from "./ServiceCompleteModal";
import { PaymentRequestModal } from "./PaymentRequestModal";
import CareRecordModal, { type CareRecordModalPayload } from "./CareRecordModal";
import ReservationEditModal from "./ReservationEditModal";
import { useChatRooms } from "../hooks/use-chat-rooms";
import { useChatMessages } from "../hooks/use-chat-messages";
import { useRequest } from "../hooks/use-request";
import { useProfilePopup } from "../hooks/use-profile-popup";
import { useReservationEdit } from "../hooks/use-reservation-edit";
import { useRoomDelete } from "../hooks/use-room-delete";
import { usePaymentFlow } from "../hooks/use-payment-flow";
import { useServiceFlow } from "../hooks/use-service-flow";
import { useApprovalActions } from "../hooks/use-approval-actions";
import { usePortOne } from "@/hooks/use-portone";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  sendMessage,
  sendImageMessage,
  sendSystemMessage,
} from "@/features/chat/actions/message-actions";
import { markRoomRead } from "@/features/chat/actions/room-actions";
import type { RoomApiItem, ChatMessageRow, Tab, Badge, Message } from "@/features/chat/types";
import { createCareRecord, getInProgressReservationByOwnerAndSitter } from "@/features/care-records/actions";
import { RESERVATION_STATUS, APPLICATION_STATUS } from "@/lib/constants";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const isLoadMoreRef = useRef(false);
  const scrollAnchorRef = useRef<number | null>(null);
  const desktopScrollAnchorRef = useRef<number | null>(null);
  const prevApplicantStatusRef = useRef<string | null | undefined>(null);

  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);

  const [mobileChatView, setMobileChatView] = useState<"list" | "room">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const hasAutoSelected = useRef(false);
  const hasRetried = useRef(false);
  const prevInitialRoomId = useRef<string | null | undefined>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [careRecordOpen, setCareRecordOpen] = useState(false);

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

  const { profilePopup, openApplicantProfile, openReservationProfile, closeProfilePopup } = useProfilePopup(
    applicants,
    reservationRequests,
    userId,
  );

  const {
    pendingDelete,
    deleting,
    deleteError,
    handleDeleteRoom,
    handleDeleteApplicant,
    handleDeleteReservationRequest,
    handleConfirmDelete,
    closeDeleteConfirm,
    leaveChat,
  } = useRoomDelete({
    rooms,
    reservationRequests,
    activeTab,
    selectedRoomId,
    selectedApplicantId,
    selectedReservationRequestId,
    deleteRoom,
    deleteApplicant,
    deleteReservationRequest,
    setSelectedRoomId,
    setSelectedApplicantId,
    setSelectedReservationRequestId,
    setMobileChatView,
  });

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

  const {
    reservationEditOpen,
    reservationEditAction,
    openReservationEdit,
    closeReservationEdit,
    handleReservationEditSubmit,
    handleReservationEditConfirm,
    handleReservationEditReject,
  } = useReservationEdit(activeRoomId, deliverMessage, updatePreview, refresh, setSendError);

  const {
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
  } = useApprovalActions({
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
  });

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

  const {
    paymentModalOpen,
    paymentReservationAmount,
    payingNow,
    closePaymentModal,
    handleOpenPaymentModal,
    handlePaymentSubmit,
    handlePayNow,
  } = usePaymentFlow({
    activeRoomId,
    selectedRoom,
    isPaymentAlreadyPaid,
    isPaymentPending,
    requestPayment,
    deliverMessage,
    updatePreview,
    setSendError,
  });

  const {
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
  } = useServiceFlow({ activeRoomId, rawMessages, deliverMessage, updatePreview, refresh, setSendError });

  const [prevActiveRoomId, setPrevActiveRoomId] = useState(activeRoomId);
  if (activeRoomId !== prevActiveRoomId) {
    setPrevActiveRoomId(activeRoomId);
    if (activeRoomId) {
      setSendError(null);
      setInput("");
    }
  }

  useEffect(() => {
    if (!activeRoomId) return;
    markRoomAsRead(activeRoomId);
    markRoomRead(activeRoomId);
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

  const handleWriteReview = useCallback(
    (reservationId: string) => {
      router.push(`/myprofile/reviews/write?bookingId=${reservationId}`);
    },
    [router],
  );

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

  const [reportTarget, setReportTarget] = useState<{
    targetType: ReportCreateInput["target_type"];
    targetId: string;
    targetLabel?: string;
  } | null>(null);

  const handleReport = useCallback(() => {
    let targetId = "";
    let targetName = "";
    let role = "펫시터";

    if (activeTab === "one_on_one") {
      const isUserSitter = selectedRoom?.sitterId === userId;
      targetId = isUserSitter ? (selectedRoom?.ownerId ?? "") : (selectedRoom?.sitterId ?? "");
      targetName = selectedRoom?.name ?? "";
      role = isUserSitter ? "보호자" : "펫시터";
    } else if (activeTab === "reservations") {
      const isUserOwner = selectedReservationRequest?.ownerId === userId;
      targetId = isUserOwner ? (selectedReservationRequest?.sitterId ?? "") : (selectedReservationRequest?.ownerId ?? "");
      targetName = selectedReservationRequest?.name ?? "";
      role = isUserOwner ? "펫시터" : "보호자";
    } else {
      const isUserSitter = selectedApplicant?.sitterId === userId;
      targetId = isUserSitter ? (selectedApplicant?.ownerId ?? "") : (selectedApplicant?.sitterId ?? "");
      targetName = isUserSitter ? "" : (selectedApplicant?.name ?? "");
      role = isUserSitter ? "보호자" : "펫시터";
    }

    if (!targetId) return;
    setReportTarget({ targetType: role === "펫시터" ? "sitter" : "user", targetId, targetLabel: targetName || undefined });
  }, [activeTab, selectedRoom, selectedReservationRequest, selectedApplicant, userId]);

  const handleReportMessage = useCallback((messageId: string) => {
    setReportTarget({ targetType: "message", targetId: messageId });
  }, []);

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
    onReportMessage: handleReportMessage,
    onNavigateToPost: handleNavigateToPost,
    onSetInput: setInput,
    onSend: handleSend,
    onLoadMore: handleLoadMore,
    onPayNow: handlePayNow,
    onOpenPaymentModal: handleOpenPaymentModal,
    onOpenCareRecord: () => setCareRecordOpen(true),
    onServiceStart: handleServiceStart,
    onServiceComplete: handleServiceComplete,
    onOpenReservationEdit: openReservationEdit,
    onPhotoClick: () => photoInputRef.current?.click(),
    onServiceConfirm: handleServiceConfirm,
    onReservationEditConfirm: handleReservationEditConfirm,
    onReservationEditReject: handleReservationEditReject,
    onRejectApplicant: handleRejectSelectedApplicant,
    onConfirmApplicant: handleConfirmSelectedApplicant,
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-[calc(100vh-64px)] bg-white">
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

      {profilePopup && <ProfilePopup data={profilePopup.data} cardVariant={profilePopup.cardVariant} onClose={closeProfilePopup} />}

      <CustomModal
        open={pendingDelete !== null}
        type="danger"
        title="채팅방을 나가시겠어요?"
        description={deleteError ?? "채팅방을 나가면 대화 내역을 다시 볼 수 없습니다."}
        confirmText={deleting ? "처리 중..." : "나가기"}
        cancelText="취소"
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
      />

      <PaymentRequestModal
        open={paymentModalOpen}
        onClose={closePaymentModal}
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
        onClose={closeReservationModal}
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
        onClose={closeAcceptModal}
        onConfirm={handleAcceptConfirm}
      />

      <ServiceCompleteModal
        open={serviceCompleteModalOpen}
        reservations={activeReservations}
        loading={serviceCompleteModalLoading}
        sending={serviceCompleteSending}
        variant="complete"
        onClose={closeServiceCompleteModal}
        onConfirm={handleServiceCompleteConfirm}
      />

      <ServiceCompleteModal
        open={serviceStartModalOpen}
        reservations={readyReservations}
        loading={serviceStartModalLoading}
        sending={serviceStartSending}
        variant="start"
        onClose={closeServiceStartModal}
        onConfirm={handleServiceStartConfirm}
      />

      {activeRoomId && (
        <ReservationEditModal open={reservationEditOpen} roomId={activeRoomId} onClose={closeReservationEdit} onSubmit={handleReservationEditSubmit} />
      )}

      {reportTarget && (
        <ReportDialog
          open={reportTarget !== null}
          onOpenChange={(open) => {
            if (!open) setReportTarget(null);
          }}
          targetType={reportTarget.targetType}
          targetId={reportTarget.targetId}
          targetLabel={reportTarget.targetLabel}
        />
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
