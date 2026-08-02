
const CONDITIONS_MARKER = "\n\n[펫시터 조건]\n";

export function mergeConditions(content: string, conditions: string): string {
  const c = conditions.trim();
  return c ? `${content.trim()}${CONDITIONS_MARKER}${c}` : content;
}

export function appendConditionLine(
  conditions: string,
  sentence: string,
): string {
  const existingLines = conditions
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim());
  if (existingLines.includes(sentence)) return conditions;
  const base = conditions.replace(/\n+$/, "");
  return base ? `${base}\n- ${sentence}` : `- ${sentence}`;
}

export function getTimeErrorMessage(
  startDate: Date | undefined,
  startTime: string,
  endTime: string,
): string | null {
  if (startTime && endTime && startTime >= endTime) {
    return "종료 시간은 시작 시간보다 늦어야 합니다.";
  }
  if (startDate && startTime) {
    const [h, m] = startTime.split(":").map(Number);
    const dt = new Date(startDate);
    dt.setHours(h, m, 0, 0);
    if (dt <= new Date()) return "과거 시간은 선택할 수 없습니다.";
  }
  return null;
}

export function splitConditions(raw: string): {
  content: string;
  conditions: string;
} {
  const idx = raw.indexOf(CONDITIONS_MARKER);
  if (idx === -1) return { content: raw, conditions: "" };
  return {
    content: raw.slice(0, idx),
    conditions: raw.slice(idx + CONDITIONS_MARKER.length),
  };
}
