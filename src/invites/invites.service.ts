import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Invite } from "src/invites/entities/invite.entity";
import { NotificationsService } from "src/notifications/notifications.service";
import { InviteStatus } from "src/shared/invite-status.enum";
import { Team } from "src/teams/entities/team.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Repository } from "typeorm";

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invite)
    private readonly inviteRepository: Repository<Invite>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    private readonly notificationService: NotificationsService,
  ) {}

  async getInvite(inviteId: number, requesterId: number) {
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId },
      relations: {
        recipient: true,
        sender: true,
        team: true,
      },
    });

    if (!invite) {
      throw new NotFoundException("Invite not found");
    }

    if (invite?.recipient.id !== requesterId) {
      throw new UnauthorizedException("You are not allowed to access this invite");
    }

    if (invite.expiresAt < new Date()) {
      throw new UnauthorizedException("This invite has expired");
    }

    return invite;
  }

  async replyToInvite(inviteId: number, requesterId: number, status: string) {
    const invite = await this.getInvite(inviteId, requesterId);

    if (invite.status !== InviteStatus.PENDING) {
      throw new UnauthorizedException("This invite has already been replied to");
    }

    if (status.toUpperCase() === InviteStatus.ACCEPTED) {
      await this.addToTeam(invite);
      invite.status = InviteStatus.ACCEPTED;

      this.notificationService.sendNotificationUser(
        invite.sender.id,
        `${invite.recipient.username} has accepted your invitation to join ${invite.team.name}`,
      );

      this.notificationService.notifyTeamMemberUpdated(invite.team.id.toString());
    } else if (status.toUpperCase() === InviteStatus.REJECTED) {
      invite.status = InviteStatus.REJECTED;

      this.notificationService.sendNotificationUser(
        invite.sender.id,
        `${invite.recipient.username} has rejected your invitation to join ${invite.team.name}`,
      );

      this.notificationService.notifyTeamMemberUpdated(invite.team.id.toString());
    } else {
      throw new UnauthorizedException("Invalid invite status");
    }

    await this.inviteRepository.save(invite);

    return { message: "Invite replied to successfully" };
  }

  private async addToTeam(invite: Invite) {
    const userTeam = new UserTeam();
    userTeam.user = invite.recipient;
    userTeam.team = invite.team;
    userTeam.role = "MEMBER";

    const newUserTeam = await this.userTeamRepository.save(userTeam);
    return newUserTeam;
  }
}
