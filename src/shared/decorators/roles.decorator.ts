import { SetMetadata } from "@nestjs/common";
import { Role } from "../enums/role.enum";

export const ROLES_KEY = "team_roles";
export const TeamRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
