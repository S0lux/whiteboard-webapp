import { z } from "zod";

export const UpdateTeamSchema = z
  .object({
    newName: z.string().min(3).max(255).optional(),
    newDescription: z.string().optional(),
  })
  .required();

export type UpdateTeamDto = z.infer<typeof UpdateTeamSchema>;
