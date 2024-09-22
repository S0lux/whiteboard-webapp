import { InviteStatus } from "src/shared/enums/invite-status.enum";
import { NotificationTarget } from "src/shared/enums/notification-target.enum";
import { NotificationType } from "src/shared/enums/notification.enum";
import { Invite } from "./entities/invite.entity";
import { InviteReplyStrategy } from "./invites-reply-strategy.interface";
import { NotificationsService } from "src/notifications/notifications.service";
import { Event } from "src/shared/enums/event.enum";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class AcceptInviteStrategy implements InviteReplyStrategy {
  constructor(
    private notificationService: NotificationsService,
    @InjectRepository(UserTeam)
    private userTeamRepository: Repository<UserTeam>,
  ) {}

  async execute(invite: Invite): Promise<void> {
    await this.addToTeam(invite);
    invite.status = InviteStatus.ACCEPTED;
    this.notificationService.joinUserToRoom(invite.recipient.id, invite.team.id);
    this.sendNotifications(invite);
  }

  private async addToTeam(invite: Invite): Promise<void> {
    const userTeam = new UserTeam();
    userTeam.user = invite.recipient;
    userTeam.team = invite.team;
    userTeam.role = "MEMBER";

    await this.userTeamRepository.save(userTeam);
  }

  private sendNotifications(invite: Invite): void {
    this.notificationService.sendNotification(
      invite.sender.id,
      NotificationTarget.USER,
      NotificationType.BASIC,
      {
        content: `${invite.recipient.username} has accepted your invitation to join ${invite.team.name}`,
      },
    );

    this.notificationService.sendEvent(
      invite.team.id,
      NotificationTarget.TEAM,
      Event.TEAM_MEMBER_UPDATED,
      invite.team.id.toString(),
    );
  }
}

@Injectable()
export class RejectInviteStrategy implements InviteReplyStrategy {
  constructor(private notificationService: NotificationsService) {}

  async execute(invite: Invite): Promise<void> {
    invite.status = InviteStatus.REJECTED;
    this.sendNotifications(invite);
  }

  private sendNotifications(invite: Invite): void {
    this.notificationService.sendNotification(
      invite.sender.id,
      NotificationTarget.USER,
      NotificationType.BASIC,
      {
        content: `${invite.recipient.username} has rejected your invitation to join ${invite.team.name}`,
      },
    );

    this.notificationService.sendEvent(
      invite.team.id,
      NotificationTarget.TEAM,
      Event.TEAM_MEMBER_UPDATED,
      invite.team.id.toString(),
    );
  }
}
