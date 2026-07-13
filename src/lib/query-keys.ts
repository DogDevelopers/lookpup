export const boardKeys = {
  all: ["board"] as const,
  list: () => [...boardKeys.all, "list"] as const,
  detail: (id: string) => [...boardKeys.all, "detail", id] as const,
  otherPosts: (ownerId: string, excludeId: string) =>
    [...boardKeys.all, "otherPosts", ownerId, excludeId] as const,
};
