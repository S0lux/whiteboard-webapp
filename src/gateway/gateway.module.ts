import { Module } from "@nestjs/common";
import { NotificationGateway } from "./notification.gateway";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserTeam])],
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class GatewayModule {}
