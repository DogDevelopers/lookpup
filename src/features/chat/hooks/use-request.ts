"use client";

import { useCallback, useEffect, useState } from "react";
import type { Applicant } from "@/features/chat/types";
import { APPLICATION_STATUS } from "@/lib/constants";

export function useRequest(applicants: Applicant[]) {
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [confirmedIds, setConfirmedIds] = useState<Map<string, string>>(
    new Map(),
  );

  useEffect(() => {
    if (applicants.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRejectedIds((prev) => {
      const toAdd = applicants.filter(
        (a) =>
          a.applicationStatus === APPLICATION_STATUS.REJECTED && !prev.has(a.id),
      );
      if (toAdd.length === 0) return prev;
      const next = new Set(prev);
      toAdd.forEach((a) => next.add(a.id));
      return next;
    });

    setConfirmedIds((prev) => {
      const toAdd = applicants.filter(
        (a) =>
          a.applicationStatus === APPLICATION_STATUS.ACCEPTED &&
          prev.get(a.postId) !== a.id,
      );
      if (toAdd.length === 0) return prev;
      const next = new Map(prev);
      toAdd.forEach((a) => next.set(a.postId, a.id));
      return next;
    });
  }, [applicants]);

  const rejectApplicant = useCallback(
    (id: string) => {
      const applicant = applicants.find((a) => a.id === id);
      if (!applicant) return;
      if (confirmedIds.get(applicant.postId) === id || rejectedIds.has(id))
        return;
      setRejectedIds((prev) => new Set(prev).add(id));
    },
    [applicants, confirmedIds, rejectedIds],
  );

  const confirmApplicant = useCallback(
    (id: string) => {
      const applicant = applicants.find((a) => a.id === id);
      if (!applicant) return;
      const postId = applicant.postId;
      if (rejectedIds.has(id) || confirmedIds.has(postId)) return;

      setConfirmedIds((prev) => new Map(prev).set(postId, id));

      const newRejected = new Set(rejectedIds);
      applicants.forEach((a) => {
        if (a.postId === postId && a.id !== id) newRejected.add(a.id);
      });
      setRejectedIds(newRejected);
    },
    [applicants, confirmedIds, rejectedIds],
  );

  const getApplicantBadge = useCallback(
    (id: string) => {
      if (rejectedIds.has(id))
        return { label: "거절됨", className: "bg-stone-100 text-stone-400" };
      const applicant = applicants.find((a) => a.id === id);
      if (applicant && confirmedIds.get(applicant.postId) === id)
        return { label: "선택됨", className: "bg-orange-50 text-orange-500" };
      return null;
    },
    [applicants, confirmedIds, rejectedIds],
  );

  return {
    rejectedIds,
    confirmedIds,
    rejectApplicant,
    confirmApplicant,
    getApplicantBadge,
  };
}
