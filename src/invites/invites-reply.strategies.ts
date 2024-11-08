import { InviteStatus } from "src/shared/enums/invite-status.enum";
import { Invite } from "./entities/invite.entity";
import { InviteReplyStrategy } from "./invites-reply-strategy.interface";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Role } from "src/shared/enums/role.enum";
import { Permission } from "src/shared/enums/permission.enum";

@Injectable()
export class AcceptInviteStrategy implements InviteReplyStrategy {
  constructor(
    @InjectRepository(UserTeam)
    private userTeamRepository: Repository<UserTeam>,
  ) { }

  async execute(invite: Invite): Promise<void> {
    await this.addToTeam(invite);
    invite.status = InviteStatus.ACCEPTED;
  }

  private async addToTeam(invite: Invite): Promise<void> {
    const userTeam = new UserTeam();
    userTeam.user = invite.recipient;
    userTeam.team = invite.team;
    userTeam.role = Role.MEMBER;
    userTeam.permission = Permission.VIEW;

    await this.userTeamRepository.save(userTeam);
  }
}

@Injectable()
export class RejectInviteStrategy implements InviteReplyStrategy {
  async execute(invite: Invite): Promise<void> {
    invite.status = InviteStatus.REJECTED;
  }
}
