import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { Repository } from "typeorm";
import { NotificationGateway } from "src/gateway/notification.gateway";
import { User } from "src/users/entities/user.entity";
import { NotificationType } from "src/shared/notification.enum";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserTeam) private userTeamRepository: Repository<UserTeam>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  private async getTeamMembers(teamId: string): Promise<User[]> {
    const relations = await this.userTeamRepository.find({
      where: { team: { id: Number(teamId) } },
      relations: { user: true },
    });

    return relations.map((relation) => relation.user);
  }

  async getNotifications(userId: number) {
    return this.notificationRepository.find({
      where: {
        user: { id: userId },
      },
      order: { createdAt: "DESC" },
    });
  }

  async sendNotificationUser(
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

  async sendNotificationTeam(
    teamId: number,
    content: string,
    type: NotificationType = NotificationType.BASIC,
    inviteId?: number,
  ) {
    const teamMembers = await this.getTeamMembers(teamId.toString());

    if (teamMembers.length === 0) {
      throw new Error("Team not found");
    }

    const notifications = teamMembers.map((member) => {
      return this.notificationRepository.create({
        content,
        type,
        user: member,
        inviteId,
      });
    });

    const newNotifications = await this.notificationRepository.save(notifications);

    teamMembers.forEach((member) => {
      this.notificationGateway.server.to(`user:${member.id}`).emit("new_notification");
    });

    return newNotifications;
  }

  async markAsRead(id: number, userId: number) {
    return this.notificationRepository.update({ id, user: { id: userId } }, { isRead: true });
  }

  async notifyAccountUpdated(userId: string) {
    this.notificationGateway.server.to(`user:${userId}`).emit("account_updated");
  }

  notifyNewNotification(userId: string) {
    this.notificationGateway.server.to(`user:${userId}`).emit("new_notification");
  }

  async notifyTeamMemberUpdated(teamId: string) {
    const teamMembers = await this.getTeamMembers(teamId);
    const userIds = teamMembers.map((member) => member.id);

    userIds.forEach((userId) => {
      this.notificationGateway.server.to(`user:${userId}`).emit("team_member_updated", teamId);
    });
  }

  notifyRemovedFromTeam(userId: string, teamId: string) {
    this.notificationGateway.server.to(`user:${userId}`).emit("removed_from_team", teamId);
  }
}
