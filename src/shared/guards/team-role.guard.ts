import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Role } from "../role.enum";
import { TeamsService } from "src/teams/teams.service";

@Injectable()
export class TeamRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly teamsService: TeamsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      throw new UnauthorizedException("User not logged in.");
    }

    const userId = request.user.id;
    const teamId = request.params.teamId;
    const userRole = await this.teamsService.getRoleForTeam(teamId, userId);

    if (!userRole) {
      return false;
    }

    return requiredRoles.includes(Role[userRole]);
  }
}
