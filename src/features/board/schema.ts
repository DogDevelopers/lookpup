import { z } from "zod";
import { APPLICATION_STATUS, REQUEST_STATUS } from "@/lib/constants";
import { SERVICE_TYPES } from "./constants";

const SERVICE_TYPE_VALUES = SERVICE_TYPES.map((s) => s.value) as [string, ...string[]];

export const requestSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요.").max(50, "제목은 50자 이하로 입력해주세요."),
  content: z.string().max(500, "내용은 500자 이하로 입력해주세요.").nullable(),
  request_type: z.enum(SERVICE_TYPE_VALUES),
  budget: z.number().int().min(0).nullable(),
  start_datetime: z.string().min(1, "시작 일시를 입력해주세요."),
  end_datetime: z.string().min(1, "종료 일시를 입력해주세요."),
  location: z.string().min(1, "위치를 입력해주세요."),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  pet_id: z.string().uuid().nullable(),
  sitter_conditions: z.array(z.string()),
  image_urls: z.array(z.string()),
});

export type RequestInput = z.infer<typeof requestSchema>;

export const requestStatusSchema = z.enum([
  REQUEST_STATUS.OPEN,
  REQUEST_STATUS.MATCHED,
  REQUEST_STATUS.CLOSED,
  REQUEST_STATUS.CANCELED,
]);

export const applicationSchema = z.object({
  request_id: z.string().uuid(),
  message: z.string().max(500).nullable(),
  proposed_price: z.number().int().min(0).nullable(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export const applicationStatusSchema = z.enum([
  APPLICATION_STATUS.PENDING,
  APPLICATION_STATUS.ACCEPTED,
  APPLICATION_STATUS.REJECTED,
  APPLICATION_STATUS.CANCELED,
]);
