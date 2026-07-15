export function formatWon(amount: number) {
  return `${amount.toLocaleString()}원`;
}

export function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
