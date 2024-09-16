import { Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { AuthenticatedGuard } from "src/auth/guards/authenticated.guard";
import { AuthUser } from "src/shared/decorators/user.decorator";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @UseGuards(AuthenticatedGuard)
  @Get()
  async getNotifications(@AuthUser("id") userId) {
    return this.notificationService.getNotifications(userId);
  }

  @UseGuards(AuthenticatedGuard)
  @Patch(":id")
  async markAsRead(@Req() req, @AuthUser("id") userId) {
    return this.notificationService.markAsRead(req.params.id, userId);
  }
}
