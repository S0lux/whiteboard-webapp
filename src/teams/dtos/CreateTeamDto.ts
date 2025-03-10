import { z } from "zod";

export const CreateTeamSchema = z
  .object({
    name: z.string().min(3).max(255),
    description: z.string().optional(),
  })
  .required();

export type CreateTeamDto = z.infer<typeof CreateTeamSchema>;
