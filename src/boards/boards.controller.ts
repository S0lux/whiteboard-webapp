import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import { AuthenticatedGuard } from "src/auth/guards/authenticated.guard";
import { AuthUser } from "src/shared/decorators/user.decorator";
import { ZodValidationPipe } from "src/shared/pipes/zod-validation.pipe";
import { BoardsService } from "./boards.service";
import { CreateBoardDto, CreateBoardSchema } from "./dtos/CreateBoardDto";

@Controller("boards")
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService
  ) { }

  @UseGuards(AuthenticatedGuard)
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateBoardSchema)) craeteBoardDto: CreateBoardDto,
    @AuthUser() user,
  ) {
    console.log(craeteBoardDto)

    return await this.boardsService.createBoard(craeteBoardDto, user)
  }

  @UseGuards(AuthenticatedGuard)
  @Get(':id')
  async getBoardById(@Param('id') id: string) {
    return await this.boardsService.getBoardById(id)
  }

  @UseGuards(AuthenticatedGuard)
  @Get(':id/userBoard')
  async getUserBoard(@Param('id') id: string, @AuthUser() user) {
    return await this.boardsService.getUserBoard(Number(id), user.id as number)
  }
}
