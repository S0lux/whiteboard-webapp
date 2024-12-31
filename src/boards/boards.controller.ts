import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { AuthenticatedGuard } from "src/auth/guards/authenticated.guard";
import { AuthUser } from "src/shared/decorators/user.decorator";
import { ZodValidationPipe } from "src/shared/pipes/zod-validation.pipe";
import { BoardsService } from "./boards.service";
import { CreateBoardDto, CreateBoardSchema } from "./dtos/CreateBoardDto";
import { number } from "zod";
import { Permission } from "src/shared/enums/permission.enum";

@Controller("boards")
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService
  ) { }

  @UseGuards(AuthenticatedGuard)
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateBoardSchema)) createBoardDto: CreateBoardDto,
    @AuthUser() user,
  ) {
    return await this.boardsService.createBoard(createBoardDto, user)
  }

  @UseGuards(AuthenticatedGuard)
  @Get(':id')
  async getBoardById(@Param('id') id: string) {
    return await this.boardsService.getBoardById(id)
  }

  @UseGuards(AuthenticatedGuard)
  @Post(':id/members')
  async inviteMemberToBoard(@Param('id') id: string, @Body() body: { userId: number, permission: Permission }) {
    return await this.boardsService.inviteMemberToBoard(Number(id), body.userId, body.permission)
  }

  // @UseGuards(AuthenticatedGuard)
  // @Get(':id/user-boards')
  // async getUserBoard(@Param('id') id: string, @AuthUser() user) {
  //   return await this.boardsService.getUserBoard(Number(id), user.id as number)
  // }
  @UseGuards(AuthenticatedGuard)
  @Get(':id/users-board')
  async getUsersBoard(@Param('id') id: string) {
    return await this.boardsService.getUsersBoard(Number(id));
  }

  @UseGuards(AuthenticatedGuard)
  @Patch(':id/users-board')
  async updateUsersBoard(@Param('id') id: string, @Body() body: { userId: number, permission: Permission }) {
    console.log(body);
    return await this.boardsService.updateUserBoardPermission(Number(id), body.userId, body.permission);
  }
}
