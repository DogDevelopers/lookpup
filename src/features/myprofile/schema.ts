import { z } from "zod";

export const bankAccountSchema = z.object({
  bankName: z.string().min(1, "은행을 입력해주세요."),
  accountNumber: z
    .string()
    .min(1, "계좌번호를 입력해주세요.")
    .regex(/^\d+$/, "계좌번호는 숫자만 입력해주세요."),
  accountHolder: z.string().min(1, "예금주명을 입력해주세요."),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;

export const ownerLocationSchema = z.object({
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  dong: z.string().min(1),
});
export type OwnerLocationInput = z.infer<typeof ownerLocationSchema>;
