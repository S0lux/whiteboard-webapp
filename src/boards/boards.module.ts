import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Board } from "./entities/board.entity";
import { BoardsController } from "./boards.controller";
import { BoardsService } from "./boards.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Board]),
  ],
  providers: [BoardsService],
  controllers: [BoardsController],
})
export class BoardsModule {}
