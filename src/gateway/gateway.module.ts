import { Module } from "@nestjs/common";
import { NotificationGateway } from "./notification.gateway";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Board } from "src/boards/entities/board.entity";
import { Path } from "src/paths/entities/path.entity";
import { Shape } from "src/shapes/entities/shape.entity";
import { User } from "src/users/entities/user.entity";
import { BoardGateWay } from "./board.gateway";
import { UserBoard } from "src/boards/entities/user_board.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserTeam, Board, Path, Shape, User, UserBoard])],
  providers: [NotificationGateway, BoardGateWay],
  exports: [NotificationGateway, BoardGateWay],
})
export class GatewayModule { }
