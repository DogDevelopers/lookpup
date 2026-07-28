import { z } from "zod";

export const reviewCreateSchema = z.object({
  reservation_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  content: z.string().max(1000, "후기는 1000자 이하로 입력해주세요."),
  image_urls: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  detail_ratings: z.record(z.string(), z.number().int().min(1).max(5)).default({}),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
