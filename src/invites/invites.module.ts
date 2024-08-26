import { Module } from "@nestjs/common";
import { InvitesService } from "./invites.service";
import { InvitesController } from "./invites.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Invite } from "src/invites/entities/invite.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Invite, UserTeam])],
  providers: [InvitesService],
  controllers: [InvitesController],
})
export class InvitesModule {}
