import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { GatewayModule } from "src/gateway/gateway.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { User } from "src/users/entities/user.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, UserTeam]), GatewayModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
