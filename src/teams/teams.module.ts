import { Module } from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { TeamsController } from "./teams.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Team } from "./entities/team.entity";
import { UserTeam } from "./entities/user-team-relation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User, Team, UserTeam])],
  providers: [TeamsService],
  controllers: [TeamsController],
})
export class TeamsModule {}
