"use client";

import { useMemo, useRef, useState } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import { CustomModal } from "@/components/common/CustomModal";
import {
  ProfilePopup,
  type ProfilePopupData,
  type Badge,
  type Message,
  canLeaveDirectRoom,
  canLeaveReservationRequest,
} from "./chat_components";
import {
  MOCK_USER_ID,
  mockApplicantMessages,
  mockApplicants,
  mockMessagesByRoomId,
  mockPosts,
  mockReservationMessages,
  mockReservationRequests,
  mockRooms,
} from "../mock-data";

type Tab = "one_on_one" | "reservations" | "applicants";

function nowTimeLabel() {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ChatClient() {
  const [activeTab, setActiveTab] = useState<Tab>("one_on_one");
  const [rooms] = useState(mockRooms);
  const [applicants, setApplicants] = useState(mockApplicants);
  const [reservationRequests, setReservationRequests] = useState(
    mockReservationRequests,
  );
  const [posts] = useState(mockPosts);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    mockRooms[0]?.id ?? null,
  );
  const [selectedApplicantId, setSelectedApplicantId] = useState<
    string | null
  >(null);
  const [selectedReservationRequestId, setSelectedReservationRequestId] =
    useState<string | null>(null);

  const [messagesByRoom, setMessagesByRoom] = useState<
    Record<string, Message[]>
  >({
    ...mockMessagesByRoomId,
    ...mockApplicantMessages,
    ...mockReservationMessages,
  });

  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileChatView, setMobileChatView] = useState<"list" | "room">(
    "list",
  );
  const [profilePopup, setProfilePopup] = useState<{
    data: ProfilePopupData;
    cardVariant: "sitter" | "owner";
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    type: "room" | "applicant" | "reservation";
  } | null>(null);
  const [confirmedServiceIds, setConfirmedServiceIds] = useState<Set<string>>(
    new Set(),
  );
  const [reviewedReservationIds] = useState<Set<string>>(new Set());
  const [confirmedEditIds, setConfirmedEditIds] = useState<Set<string>>(
    new Set(),
  );
  const [rejectedApplicantIds, setRejectedApplicantIds] = useState<
    Set<string>
  >(new Set());
  const [confirmedApplicantByPost, setConfirmedApplicantByPost] = useState<
    Map<string, string>
  >(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const activeRoomId =
    activeTab === "one_on_one"
      ? selectedRoomId
      : activeTab === "reservations"
        ? selectedReservationRequestId
        : selectedApplicantId;

  const messages = activeRoomId ? (messagesByRoom[activeRoomId] ?? []) : [];

  function appendMessage(roomId: string, message: Message) {
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] ?? []), message],
    }));
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const selectedApplicant = applicants.find(
    (a) => a.id === selectedApplicantId,
  );
  const selectedReservationRequest = reservationRequests.find(
    (rr) => rr.id === selectedReservationRequestId,
  );

  function getApplicantBadge(id: string): Badge | null {
    const applicant = applicants.find((a) => a.id === id);
    if (!applicant) return null;
    if (rejectedApplicantIds.has(id))
      return { label: "거절됨", className: "bg-stone-100 text-stone-500" };
    if (confirmedApplicantByPost.get(applicant.postId) === id)
      return { label: "선택됨", className: "bg-green-50 text-green-700" };
    return null;
  }

  function handleSend() {
    if (!input.trim() || !activeRoomId) return;
    appendMessage(activeRoomId, {
      id: `local-${Date.now()}`,
      from: "me",
      text: input.trim(),
      time: nowTimeLabel(),
      rawDate: new Date().toISOString(),
    });
    setInput("");
  }

  function handleServiceConfirm(reservationId: string) {
    setConfirmedServiceIds((prev) => new Set([...prev, reservationId]));
  }

  function handleReservationEditConfirm(messageId: string) {
    setConfirmedEditIds((prev) => new Set([...prev, messageId]));
  }

  function handleReservationEditReject(messageId: string) {
    setConfirmedEditIds((prev) => new Set([...prev, messageId]));
  }

  function handleRejectApplicant(id: string) {
    setRejectedApplicantIds((prev) => new Set([...prev, id]));
  }

  function handleConfirmApplicant(id: string) {
    const applicant = applicants.find((a) => a.id === id);
    if (!applicant) return;
    setConfirmedApplicantByPost((prev) => {
      const next = new Map(prev);
      next.set(applicant.postId, id);
      return next;
    });
  }

  function handleDeleteRoom(id: string) {
    const room = rooms.find((r) => r.id === id);
    if (room && !canLeaveDirectRoom(room)) return;
    setPendingDelete({ id, type: "room" });
  }

  function handleDeleteApplicant(id: string) {
    setPendingDelete({ id, type: "applicant" });
  }

  function handleDeleteReservationRequest(id: string) {
    const rr = reservationRequests.find((r) => r.id === id);
    if (rr && !canLeaveReservationRequest(rr)) return;
    setPendingDelete({ id, type: "reservation" });
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.type === "applicant") {
      setApplicants((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      if (selectedApplicantId === pendingDelete.id)
        setSelectedApplicantId(null);
    } else if (pendingDelete.type === "reservation") {
      setReservationRequests((prev) =>
        prev.filter((r) => r.id !== pendingDelete.id),
      );
      if (selectedReservationRequestId === pendingDelete.id)
        setSelectedReservationRequestId(null);
    } else if (selectedRoomId === pendingDelete.id) {
      setSelectedRoomId(null);
    }
    setMobileChatView("list");
    setPendingDelete(null);
  }

  function openApplicantProfile(id: string) {
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
      cardVariant: a.ownerId === MOCK_USER_ID ? "sitter" : "owner",
    });
  }

  function openReservationProfile(id: string) {
    const r = reservationRequests.find((r) => r.id === id);
    if (!r) return;
    setProfilePopup({
      data: {
        sitterId: r.sitterId,
        name: r.name,
        initial: r.initial,
        profileImage: r.profileImage,
      },
      cardVariant: r.ownerId === MOCK_USER_ID ? "sitter" : "owner",
    });
  }

  const filteredRooms = useMemo(
    () =>
      rooms.filter(
        (r) =>
          !searchQuery ||
          r.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [rooms, searchQuery],
  );
  const filteredApplicants = useMemo(
    () =>
      applicants.filter(
        (a) =>
          !searchQuery ||
          a.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [applicants, searchQuery],
  );
  const filteredPosts = useMemo(
    () => posts.filter((p) => filteredApplicants.some((a) => a.postId === p.id)),
    [posts, filteredApplicants],
  );
  const filteredReservationRequests = useMemo(
    () =>
      reservationRequests.filter(
        (rr) =>
          !searchQuery ||
          rr.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [reservationRequests, searchQuery],
  );

  function getHeaderBadge(): Badge {
    if (activeTab === "one_on_one")
      return { label: "진행중", className: "bg-orange-50 text-orange-500" };
    if (activeTab === "reservations") {
      const status = selectedReservationRequest?.reservationStatus;
      if (status === "canceled")
        return { label: "거절됨", className: "bg-stone-100 text-stone-500" };
      if (status === "accepted")
        return { label: "확정됨", className: "bg-green-50 text-green-600" };
      return { label: "대기 중", className: "bg-orange-50 text-orange-400" };
    }
    if (selectedApplicantId && rejectedApplicantIds.has(selectedApplicantId))
      return { label: "거절됨", className: "bg-stone-100 text-stone-500" };
    if (
      confirmedApplicantByPost.get(selectedApplicant?.postId ?? "") ===
      selectedApplicantId
    )
      return { label: "선택됨", className: "bg-green-50 text-green-700" };
    return { label: "채팅중", className: "bg-orange-50 text-orange-500" };
  }

  function getHeaderSub(): string {
    if (activeTab === "one_on_one") return selectedRoom?.sub ?? "";
    if (activeTab === "reservations") {
      const status = selectedReservationRequest?.reservationStatus;
      if (status === "accepted") return "예약 요청 · 확정됨";
      if (status === "canceled") return "예약 요청 · 거절됨";
      return "예약 요청 · 대기 중";
    }
    return "구인글 채팅 · 지원자";
  }

  const roomName =
    activeTab === "one_on_one"
      ? (selectedRoom?.name ?? "")
      : activeTab === "reservations"
        ? (selectedReservationRequest?.name ?? "")
        : (selectedApplicant?.name ?? "");
  const roomInitial =
    activeTab === "one_on_one"
      ? (selectedRoom?.initial ?? "")
      : activeTab === "reservations"
        ? (selectedReservationRequest?.initial ?? "")
        : (selectedApplicant?.initial ?? "");
  const roomProfileImage =
    activeTab === "one_on_one"
      ? (selectedRoom?.profileImage ?? null)
      : activeTab === "reservations"
        ? (selectedReservationRequest?.profileImage ?? null)
        : (selectedApplicant?.profileImage ?? null);

  const isCurrentUserSitter =
    activeTab === "one_on_one" &&
    !!selectedRoom &&
    selectedRoom.ownerId !== MOCK_USER_ID;

  const hasServiceStarted = messages.some((m) => m.from === "service_start");
  const hasServiceCompleted = messages.some(
    (m) => m.from === "service_complete",
  );
  const isPaymentComplete = messages.some(
    (m) => m.from === "payment_complete",
  );

  const isOwnerOfSelectedRoom = selectedApplicant?.ownerId === MOCK_USER_ID;
  const showApplicantActions =
    activeTab === "applicants" &&
    !!selectedApplicantId &&
    isOwnerOfSelectedRoom &&
    !rejectedApplicantIds.has(selectedApplicantId) &&
    confirmedApplicantByPost.get(selectedApplicant?.postId ?? "") !==
      selectedApplicantId;

  const isRejectedApplicant =
    activeTab === "applicants" &&
    !isOwnerOfSelectedRoom &&
    !!selectedApplicantId &&
    rejectedApplicantIds.has(selectedApplicantId);

  const isRecipientLeft = false;

  const canLeaveActiveRoom =
    activeTab === "one_on_one"
      ? !selectedRoom || canLeaveDirectRoom(selectedRoom)
      : activeTab === "reservations"
        ? !selectedReservationRequest ||
          canLeaveReservationRequest(selectedReservationRequest)
        : true;

  function leaveChat() {
    if (activeTab === "one_on_one" && selectedRoomId)
      handleDeleteRoom(selectedRoomId);
    else if (activeTab === "reservations" && selectedReservationRequestId)
      handleDeleteReservationRequest(selectedReservationRequestId);
    else if (activeTab === "applicants" && selectedApplicantId)
      handleDeleteApplicant(selectedApplicantId);
  }

  const sharedSidebarProps = {
    activeTab,
    searchQuery,
    loading: false,
    error: null,
    userId: MOCK_USER_ID,
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
    rejectedIds: rejectedApplicantIds,
    confirmedIds: confirmedApplicantByPost,
    actioningId: null,
    getApplicantBadge,
    onSearchChange: setSearchQuery,
    onDeleteRoom: handleDeleteRoom,
    onDeleteApplicant: handleDeleteApplicant,
    onDeleteReservationRequest: handleDeleteReservationRequest,
    onRejectReservation: (id: string) =>
      setReservationRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, reservationStatus: "canceled" } : r,
        ),
      ),
    onAcceptReservation: (id: string) =>
      setReservationRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, reservationStatus: "accepted" } : r,
        ),
      ),
    onRejectApplicant: handleRejectApplicant,
    onConfirm: handleConfirmApplicant,
    onAvatarClick: openApplicantProfile,
    onReservationAvatarClick: openReservationProfile,
  };

  const sharedChatWindowProps = {
    roomName,
    roomInitial,
    roomProfileImage,
    headerSub: getHeaderSub(),
    headerBadge: getHeaderBadge(),
    activeTab,
    selectedApplicantPostId: selectedApplicant?.postId,
    messages,
    mobileScrollRef,
    messagesEndRef,
    hasMore: false,
    loadingMore: false,
    confirmedEditIds,
    reservationEditAction: null,
    confirmedServiceIds,
    reviewedReservationIds,
    payingNow: false,
    isPaymentPending: false,
    isServiceConfirming: false,
    isCurrentUserSitter,
    isPaymentComplete,
    hasServiceStarted,
    hasServiceCompleted,
    canLeaveChat: canLeaveActiveRoom,
    canViewProfile: !!selectedRoom && selectedRoom.ownerId === MOCK_USER_ID,
    canStartService: true,
    input,
    sending: false,
    sendError: null,
    isRejectedApplicant,
    isRecipientLeft,
    showApplicantActions,
    applicationActionError: null,
    actioningId: null,
    onLeaveChat: leaveChat,
    onWriteReview: () => {},
    onReport: () => {},
    onNavigateToPost: () => {},
    onSetInput: setInput,
    onSend: handleSend,
    onLoadMore: () => {},
    onPayNow: (data: { messageId: string; amount: number; reason: string }) => {
      if (!activeRoomId) return;
      appendMessage(activeRoomId, {
        id: `payment-complete-${Date.now()}`,
        from: "payment_complete",
        text: "",
        time: nowTimeLabel(),
        paymentData: { amount: data.amount, reason: data.reason, deadline: "" },
        paymentRequestMessageId: data.messageId,
        sentByMe: true,
      });
    },
    onOpenPaymentModal: () => {},
    onOpenCareRecord: () => {},
    onServiceStart: () => {},
    onServiceComplete: () => {},
    onOpenReservationEdit: () => {},
    onPhotoClick: () => {},
    onServiceConfirm: handleServiceConfirm,
    onReservationEditConfirm: (messageId: string) =>
      handleReservationEditConfirm(messageId),
    onReservationEditReject: handleReservationEditReject,
    onRejectApplicant: () =>
      selectedApplicantId && handleRejectApplicant(selectedApplicantId),
    onConfirmApplicant: () =>
      selectedApplicantId && handleConfirmApplicant(selectedApplicantId),
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-[calc(100vh-64px)] bg-orange-50">
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        {mobileChatView === "list" ? (
          <ChatSidebar
            {...sharedSidebarProps}
            className="flex flex-col h-full"
            isMobile
            onTabChange={(tab) => {
              setActiveTab(tab);
              setMobileChatView("list");
            }}
            onRoomSelect={(id) => {
              setSelectedRoomId(id);
              setMobileChatView("room");
            }}
            onApplicantSelect={(id) => {
              setSelectedApplicantId(id);
              setMobileChatView("room");
            }}
            onReservationSelect={(id) => {
              setSelectedReservationRequestId(id);
              setMobileChatView("room");
            }}
          />
        ) : (
          <ChatWindow
            {...sharedChatWindowProps}
            isMobile
            loading={false}
            error={null}
            isEmpty={false}
            hasSelection
            onBack={() => setMobileChatView("list")}
            onGoToProfile={() => {}}
            onGoToChat={() => setMobileChatView("list")}
          />
        )}
      </div>

      <div className="hidden md:flex flex-1 bg-white overflow-hidden">
        <ChatSidebar
          {...sharedSidebarProps}
          className="w-96 bg-white border-r border-orange-100 flex flex-col shrink-0"
          onTabChange={setActiveTab}
          onRoomSelect={setSelectedRoomId}
          onApplicantSelect={setSelectedApplicantId}
          onReservationSelect={setSelectedReservationRequestId}
        />
        <ChatWindow
          {...sharedChatWindowProps}
          isMobile={false}
          loading={false}
          error={null}
          isEmpty={
            (activeTab === "one_on_one" && rooms.length === 0) ||
            (activeTab === "applicants" && applicants.length === 0) ||
            (activeTab === "reservations" && reservationRequests.length === 0)
          }
          hasSelection={
            !(
              (activeTab === "one_on_one" && selectedRoomId === null) ||
              (activeTab === "applicants" && selectedApplicantId === null) ||
              (activeTab === "reservations" &&
                selectedReservationRequestId === null)
            )
          }
          onBack={() => {}}
          onGoToProfile={() => {}}
          onGoToChat={() => setActiveTab("one_on_one")}
        />
      </div>

      {profilePopup && (
        <ProfilePopup
          data={profilePopup.data}
          cardVariant={profilePopup.cardVariant}
          onClose={() => setProfilePopup(null)}
        />
      )}

      <CustomModal
        open={pendingDelete !== null}
        type="danger"
        title="채팅방을 나가시겠어요?"
        description="채팅방을 나가면 대화 내역을 다시 볼 수 없습니다."
        confirmText="나가기"
        cancelText="취소"
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
