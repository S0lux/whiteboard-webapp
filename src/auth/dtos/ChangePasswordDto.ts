import { z } from "zod";

export const ChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(6).max(32),
    newPassword: z.string().min(6).max(32),
  })
  .required();

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
