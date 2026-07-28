import { z } from "zod";

const notificationPrefsSchema = z.object({
  reservation: z.boolean(),
  chat: z.boolean(),
  marketing: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

const STORAGE_KEY = "notification-prefs";

const DEFAULT_PREFS: NotificationPrefs = {
  reservation: true,
  chat: true,
  marketing: false,
};

type NotificationCategory = keyof NotificationPrefs;

const TYPE_TO_CATEGORY: Partial<Record<string, NotificationCategory>> = {
  application: "reservation",
  application_selected: "reservation",
  application_rejected: "reservation",
  reservation: "reservation",
  care_record: "reservation",
  message: "chat",
};

export function getNotificationCategory(type: string): NotificationCategory | null {
  return TYPE_TO_CATEGORY[type] ?? null;
}

export function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PREFS;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFS;
  }

  const parsed = notificationPrefsSchema.safeParse(json);
  return parsed.success ? parsed.data : DEFAULT_PREFS;
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
