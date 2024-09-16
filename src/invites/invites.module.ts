import { Module } from "@nestjs/common";
import { InvitesService } from "./invites.service";
import { InvitesController } from "./invites.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Invite } from "src/invites/entities/invite.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { NotificationsModule } from "src/notifications/notifications.module";
import { Team } from "src/teams/entities/team.entity";
import { User } from "src/users/entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Invite, UserTeam, Team, User]), NotificationsModule],
  providers: [InvitesService],
  controllers: [InvitesController],
})
export class InvitesModule {}
