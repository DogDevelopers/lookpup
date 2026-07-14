export const boardKeys = {
  all: ["board"] as const,
  list: () => [...boardKeys.all, "list"] as const,
  detail: (id: string) => [...boardKeys.all, "detail", id] as const,
  otherPosts: (ownerId: string, excludeId: string) =>
    [...boardKeys.all, "otherPosts", ownerId, excludeId] as const,
};

export const chatKeys = {
  all: ["chat"] as const,
  rooms: () => [...chatKeys.all, "rooms"] as const,
  messages: (roomId: string) => [...chatKeys.all, "messages", roomId] as const,
};

export const reservationKeys = {
  all: ["reservations"] as const,
  byRoom: (roomId: string) => [...reservationKeys.all, "byRoom", roomId] as const,
  active: (roomId: string) => [...reservationKeys.all, "active", roomId] as const,
  ready: (roomId: string) => [...reservationKeys.all, "ready", roomId] as const,
  statuses: (ids: string[]) => [...reservationKeys.all, "statuses", ids] as const,
  requestDetails: (reservationId: string) =>
    [...reservationKeys.all, "requestDetails", reservationId] as const,
};

export const applicationKeys = {
  all: ["applications"] as const,
  requestDetails: (roomId: string) =>
    [...applicationKeys.all, "requestDetails", roomId] as const,
};

export const paymentKeys = {
  all: ["payments"] as const,
  activeBySitter: (sitterId: string) =>
    [...paymentKeys.all, "activeBySitter", sitterId] as const,
};
