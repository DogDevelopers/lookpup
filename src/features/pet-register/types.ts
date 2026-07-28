import type { z } from "zod";
import type { petRegisterSchema } from "./schema";

export type PetRegisterFormValues = z.infer<typeof petRegisterSchema>;
