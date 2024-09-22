import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Invite } from "src/invites/entities/invite.entity";
import { NotificationsService } from "src/notifications/notifications.service";
import { InviteStatus } from "src/shared/enums/invite-status.enum";
import { Team } from "src/teams/entities/team.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Repository } from "typeorm";
import { InviteReplyStrategy } from "./invites-reply-strategy.interface";
import { AcceptInviteStrategy, RejectInviteStrategy } from "./invites-reply.strategies";

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invite)
    private readonly inviteRepository: Repository<Invite>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    private readonly notificationService: NotificationsService,
    private readonly acceptInviteStrategy: AcceptInviteStrategy,
    private readonly rejectInviteStrategy: RejectInviteStrategy,
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
    this.validateInviteStatus(invite);
    this.validateReplyStatus(status);

    const replyStrategy = this.getReplyStrategy(status);
    await replyStrategy.execute(invite);

    await this.inviteRepository.save(invite);

    return { message: "Invite replied to successfully" };
  }

  private validateInviteStatus(invite: Invite) {
    if (invite.status !== InviteStatus.PENDING) {
      throw new UnauthorizedException("This invite has already been replied to");
    }
  }

  private validateReplyStatus(status: string) {
    const validStatuses = [InviteStatus.ACCEPTED, InviteStatus.REJECTED];
    if (!validStatuses.includes(status.toUpperCase() as InviteStatus)) {
      throw new UnauthorizedException("Invalid invite status");
    }
  }

  private getReplyStrategy(status: string): InviteReplyStrategy {
    const strategies = {
      [InviteStatus.ACCEPTED]: this.acceptInviteStrategy,
      [InviteStatus.REJECTED]: this.rejectInviteStrategy,
    };
    return strategies[status.toUpperCase()];
  }
}
