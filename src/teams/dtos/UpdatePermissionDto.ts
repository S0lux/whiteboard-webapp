import { Permission } from "src/shared/enums/permission.enum";
import { z } from "zod";

export const UpdatePermissionSchema = z
    .object({
        userId: z.coerce.number(),
        teamId: z.coerce.number(),
        permission: z.nativeEnum(Permission),
    })
    .required();

export type UpdatePermissionDto = z.infer<typeof UpdatePermissionSchema>;
