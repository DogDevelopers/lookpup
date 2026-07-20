import { useCallback, useState } from "react";
import type { Applicant, ReservationRequest } from "@/features/chat/types";
import type { ProfilePopupData } from "../components/ChatWindowHeader";

export function useProfilePopup(
  applicants: Applicant[],
  reservationRequests: ReservationRequest[],
  userId: string | null,
) {
  const [profilePopup, setProfilePopup] = useState<{
    data: ProfilePopupData;
    cardVariant: "sitter" | "owner";
  } | null>(null);

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

  const closeProfilePopup = useCallback(() => setProfilePopup(null), []);

  return { profilePopup, openApplicantProfile, openReservationProfile, closeProfilePopup };
}
