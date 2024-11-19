import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Board } from "./entities/board.entity";
import { BoardsController } from "./boards.controller";
import { BoardsService } from "./boards.service";
import { User } from "src/users/entities/user.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Team } from "src/teams/entities/team.entity";
import { UserBoard } from "./entities/user_board.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Board, User, UserTeam, Team, UserBoard]),
  ],
  providers: [BoardsService],
  controllers: [BoardsController],
})
export class BoardsModule { }
