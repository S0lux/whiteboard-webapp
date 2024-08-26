import { z } from "zod";

export const InviteMemberSchema = z
  .object({
    recipientEmail: z.string().email(),
  })
  .required();

export type InviteMemberDto = z.infer<typeof InviteMemberSchema>;
