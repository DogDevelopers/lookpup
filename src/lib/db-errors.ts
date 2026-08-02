export function isOverlapViolation(error: { code?: string } | null): boolean {
  return error?.code === "23P01";
}
