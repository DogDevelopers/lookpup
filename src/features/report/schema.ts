import { z } from "zod";

export const reportCreateSchema = z.object({
  target_type: z.enum(["user", "sitter", "request", "service", "reservation", "review", "message"]),
  target_id: z.string().uuid(),
  reason: z.string().min(1, "신고 사유를 선택해주세요."),
  content: z.string().max(1000, "상세 내용은 1000자 이하로 입력해주세요.").nullable(),
  image_urls: z.array(z.string()).default([]),
});

export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
