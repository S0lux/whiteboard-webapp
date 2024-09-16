import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { Repository } from "typeorm";
import { NotificationGateway } from "src/gateway/notification.gateway";
import { User } from "src/users/entities/user.entity";
import { NotificationType } from "src/shared/notification.enum";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async getNotifications(userId: number) {
    return this.notificationRepository.find({
      where: {
        user: { id: userId },
      },
      order: { createdAt: "DESC" },
    });
  }

  async createNotification(
    userId: number,
    content: string,
    type: NotificationType = NotificationType.BASIC,
    inviteId?: number,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    this.notificationGateway.server.to;

    if (!user) {
      throw new Error("User not found");
    }

    const notification = this.notificationRepository.create({
      content,
      type,
      user,
      inviteId,
    });

    const newNotification = await this.notificationRepository.save(notification);

    this.notificationGateway.server.to(`user:${userId}`).emit("new_notification");

    return newNotification;
  }

  async markAsRead(id: number, userId: number) {
    return this.notificationRepository.update({ id, user: { id: userId } }, { isRead: true });
  }

  notifyAccountUpdated(userId: string) {
    this.notificationGateway.server.to(`user:${userId}`).emit("account_updated");
  }

  notifyNewNotification(userId: string) {
    this.notificationGateway.server.to(`user:${userId}`).emit("new_notification");
  }

  notifyTeamMemberUpdated(userId: string[], teamId: string) {
    userId.forEach((userId) => {
      this.notificationGateway.server.to(`user:${userId}`).emit("team_member_updated", teamId);
    });
  }

  notifyRemovedFromTeam(userId: string, teamId: string) {
    this.notificationGateway.server.to(`user:${userId}`).emit("removed_from_team", teamId);
  }
}
