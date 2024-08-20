import { z } from "zod";

export const UserRegisterSchema = z
  .object({
    username: z.string().min(3).max(20),
    password: z.string().min(6).max(32),
    email: z.string().email(),
  })
  .required();

export type UserRegisterDto = z.infer<typeof UserRegisterSchema>;
