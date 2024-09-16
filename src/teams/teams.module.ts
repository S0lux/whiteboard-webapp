import { Module } from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { TeamsController } from "./teams.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Team } from "./entities/team.entity";
import { UserTeam } from "./entities/user-team-relation.entity";
import { UploaderModule } from "src/uploader/uploader.module";
import { UsersModule } from "src/users/users.module";
import { Invite } from "../invites/entities/invite.entity";
import { EmailModule } from "src/email/email.module";
import { NotificationsModule } from "src/notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Team, UserTeam, Invite]),
    UploaderModule,
    UsersModule,
    EmailModule,
    NotificationsModule,
  ],
  providers: [TeamsService],
  controllers: [TeamsController],
})
export class TeamsModule {}
