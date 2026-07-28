import { useCallback, useState } from "react";
import { canLeaveDirectRoom, canLeaveReservationRequest } from "@/features/chat/utils";
import type { SelectedKind, ChatRoom, ReservationRequest } from "@/features/chat/types";

type DeleteResult = Promise<{ error?: string }>;

export function useRoomDelete(params: {
  rooms: ChatRoom[];
  reservationRequests: ReservationRequest[];
  selectedKind: SelectedKind;
  selectedRoomId: string | null;
  selectedApplicantId: string | null;
  selectedReservationRequestId: string | null;
  deleteRoom: (id: string) => DeleteResult;
  deleteApplicant: (id: string) => DeleteResult;
  deleteReservationRequest: (id: string) => DeleteResult;
  setSelectedRoomId: (id: string | null) => void;
  setSelectedApplicantId: (id: string | null) => void;
  setSelectedReservationRequestId: (id: string | null) => void;
  setMobileChatView: (view: "list" | "room") => void;
}) {
  const {
    rooms,
    reservationRequests,
    selectedKind,
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
  } = params;

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    type: "room" | "applicant" | "reservation";
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleDeleteReservationRequest = useCallback(
    (id: string) => {
      const rr = reservationRequests.find((r) => r.id === id);
      if (rr && !canLeaveReservationRequest(rr)) return;
      setPendingDelete({ id, type: "reservation" });
      setDeleteError(null);
    },
    [reservationRequests],
  );

  const handleConfirmDelete = useCallback(async () => {
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
  }, [
    pendingDelete,
    deleting,
    deleteRoom,
    deleteReservationRequest,
    deleteApplicant,
    selectedRoomId,
    selectedReservationRequestId,
    selectedApplicantId,
    setSelectedRoomId,
    setSelectedReservationRequestId,
    setSelectedApplicantId,
    setMobileChatView,
  ]);

  const closeDeleteConfirm = useCallback(() => setPendingDelete(null), []);

  const leaveChat = useCallback(() => {
    if (selectedKind === "room" && selectedRoomId !== null) handleDeleteRoom(selectedRoomId);
    else if (selectedKind === "reservation" && selectedReservationRequestId !== null) handleDeleteReservationRequest(selectedReservationRequestId);
    else if (selectedKind === "applicant" && selectedApplicantId !== null) handleDeleteApplicant(selectedApplicantId);
  }, [selectedKind, selectedRoomId, selectedReservationRequestId, selectedApplicantId, handleDeleteRoom, handleDeleteReservationRequest, handleDeleteApplicant]);

  return {
    pendingDelete,
    deleting,
    deleteError,
    handleDeleteRoom,
    handleDeleteApplicant,
    handleDeleteReservationRequest,
    handleConfirmDelete,
    closeDeleteConfirm,
    leaveChat,
  };
}
