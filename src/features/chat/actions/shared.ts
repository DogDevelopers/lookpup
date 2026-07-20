export type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

export const SERVICE_TYPE_LABEL: Record<string, string> = {
  walk: "산책",
  care: "방문 돌봄",
  hotel: "위탁 돌봄",
  pickup: "픽업",
};

export function isRecipientActive(
  room: { owner_id: string | null; owner_left?: boolean | null; sitter_left?: boolean | null },
  recipientId: string | null | undefined,
): recipientId is string {
  if (!recipientId) return false;
  const left = recipientId === room.owner_id ? room.owner_left : room.sitter_left;
  return !left;
}
