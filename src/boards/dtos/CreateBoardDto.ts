import { z } from "zod";

export const CreateBoardSchema = z
    .object({
        name: z.string().min(3).max(255),
        teamId: z.coerce.number(),
    })
    .required();

export type CreateBoardDto = z.infer<typeof CreateBoardSchema>;
