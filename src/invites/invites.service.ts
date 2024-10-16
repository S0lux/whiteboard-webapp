import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Invite } from "src/invites/entities/invite.entity";
import { InviteStatus } from "src/shared/enums/invite-status.enum";
import { Repository } from "typeorm";
import { InviteReplyStrategy } from "./invites-reply-strategy.interface";
import { AcceptInviteStrategy, RejectInviteStrategy } from "./invites-reply.strategies";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invite)
    private readonly inviteRepository: Repository<Invite>,
    private readonly eventEmitter: EventEmitter2,
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

    if (status === InviteStatus.ACCEPTED) {
      this.eventEmitter.emit("invite.accepted", {
        recipientId: invite.recipient.id,
        receipientName: invite.recipient.username,
        senderId: invite.sender.id,
        teamId: invite.team.id,
      });
    } else {
      this.eventEmitter.emit("invite.rejected", {
        recipientId: invite.recipient.id,
        receipientName: invite.recipient.username,
        senderId: invite.sender.id,
        teamId: invite.team.id,
      });
    }

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
