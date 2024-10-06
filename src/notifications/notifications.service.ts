import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { Repository } from "typeorm";
import { NotificationGateway } from "src/gateway/notification.gateway";
import { User } from "src/users/entities/user.entity";
import { NotificationType } from "src/shared/enums/notification.enum";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Event } from "src/shared/enums/event.enum";
import { NotificationTarget } from "src/shared/enums/notification-target.enum";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserTeam) private userTeamRepository: Repository<UserTeam>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  joinUserToRoom(userId: number, teamId: number) {
    this.notificationGateway.server.in(`user:${userId}`).socketsJoin(`team:${teamId}`);
  }

  removeUserFromRoom(userId: number, teamId: number) {
    this.notificationGateway.removeUserFromTeamRoom(userId, teamId);
  }

  disbandRoom(roomId: string) {
    this.notificationGateway.server.in(roomId).socketsLeave(roomId);
  }

  async getNotifications(userId: number) {
    return this.notificationRepository.find({
      where: {
        user: { id: userId },
      },
      order: { createdAt: "DESC" },
    });
  }

  private async createNotification(
    userId: number,
    type: NotificationType,
    data: { content: string; inviteId?: number },
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new InternalServerErrorException("User not found");
    }

    if (type === NotificationType.INVITE && !data.inviteId)
      throw new InternalServerErrorException("Invite ID is required");

    const notification = this.notificationRepository.create({
      user,
      type,
      content: data.content,
      inviteId: data.inviteId,
    });

    await this.notificationRepository.save(notification);

    return notification;
  }

  async sendNotification(
    targetId: number,
    targetType: NotificationTarget,
    type: NotificationType,
    data: { content: string; inviteId?: number },
  ) {
    if (targetType === NotificationTarget.USER) {
      const notification = await this.createNotification(targetId, type, data);
      this.notificationGateway.server
        .to(`user:${targetId}`)
        .emit(Event.NEW_NOTIFICATION, notification);
    }

    if (targetType === NotificationTarget.TEAM) {
      const users = await this.userTeamRepository.find({
        where: {
          team: { id: targetId },
        },
        relations: ["user"],
      });

      const userIds = users.map((user) => user.user.id);

      const notificationRequests = userIds.map((userId) =>
        this.createNotification(userId, type, data),
      );
      await Promise.all(notificationRequests);

      this.notificationGateway.server.to(`team:${targetId}`).emit(Event.NEW_NOTIFICATION);
    }
  }

  async sendEvent(targetId: number, targetType: NotificationTarget, eventType: Event, data?: any) {
    if (targetType === NotificationTarget.USER) {
      if (data) this.notificationGateway.server.to(`user:${targetId}`).emit(eventType, data);
      else this.notificationGateway.server.to(`user:${targetId}`).emit(eventType);
    }

    if (targetType === NotificationTarget.TEAM) {
      if (data) this.notificationGateway.server.to(`team:${targetId}`).emit(eventType, data);
      else this.notificationGateway.server.to(`team:${targetId}`).emit(eventType);
    }
  }

  async markAsRead(notificationId: number, userId: number) {
    await this.notificationRepository.update(
      { id: notificationId, user: { id: userId } },
      { isRead: true },
    );

    return this.notificationRepository.findOne({
      where: { id: notificationId, user: { id: userId } },
    });
  }
}
