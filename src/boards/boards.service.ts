import {
  BadRequestException,
  Injectable
} from "@nestjs/common";
import { CreateBoardDto } from "./dtos/CreateBoardDto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/users/entities/user.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Board } from "./entities/board.entity";
import { Team } from "src/teams/entities/team.entity";
import { UserBoard } from "./entities/user_board.entity";
import { Permission } from "src/shared/enums/permission.enum";

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserTeam) private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(Board) private readonly boardRepository: Repository<Board>,
    @InjectRepository(Team) private readonly teamRepository: Repository<Team>,
    @InjectRepository(UserBoard) private readonly userBoardRepository: Repository<UserBoard>,
  ) { }

  async createBoard(data: CreateBoardDto, creator: { id: number }) {
    const user = await this.userRepository.findOne(
      { where: { id: creator.id } }
    )

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const userTeam = await this.userTeamRepository.findOne({
      where: { user: { id: user.id } }
    })
    if (!userTeam) {
      throw new BadRequestException("User is not a member of any team");
    }

    const team = await this.teamRepository.findOne({ where: { id: data.teamId } })
    if (!team) {
      throw new BadRequestException("Team not found")
    }
    const newBoard = new Board({ name: data.name, team, owner: user });
    await this.boardRepository.save(newBoard);

    const userBoard = new UserBoard({ user, board: newBoard, permission: Permission.EDIT });

    await this.userBoardRepository.save(userBoard);

    const rawUsersBoard = await this.userTeamRepository.find({
      where: { team: team }, relations: ["user"]
    });

    for (const userTeam of rawUsersBoard) {
      if (userTeam.user.id !== user.id) {
        const userBoard = new UserBoard({ user: userTeam.user, board: newBoard, permission: Permission.VIEW });
        await this.userBoardRepository.save(userBoard);
      }
    }

  }

  async inviteMemberToBoard(boardId: number, userId: number, permission: Permission) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const board = await this.boardRepository.findOne({
      where: { id: boardId }
    });
    if (!board) {
      throw new BadRequestException("Board not found");
    }

    const userBoard = new UserBoard({ user, board, permission });
    await this.userBoardRepository.save(userBoard);
    console.log(userBoard);
  }

  async getBoardById(id: string) {
    return await this.boardRepository.findOne({
      where: { id: Number(id) },
      relations: ["paths", "shapes", "owner", "team"]
    });
  }

  async getUserBoard(boardId: number, userId: number) {
    let userBoard = await this.userBoardRepository.findOne({
      where: { board: { id: boardId }, user: { id: userId } }
    });
    return userBoard;
  }

  async getUsersBoard(boardId: number) {
    const usersBoard = await this.userBoardRepository.find({
      where: { board: { id: boardId } }, relations: ["user"]
    });
    return usersBoard.map(userBoard => {
      return {
        user: userBoard.user,
        data: userBoard.data,
        permission: userBoard.permission
      }
    });
  }

  async updateUserBoardPermission(boardId: number, userId: number, permission: Permission) {
    let userBoard = await this.userBoardRepository.findOne({
      where: { board: { id: boardId }, user: { id: userId } }
    });
    if (!userBoard) {
      throw new BadRequestException("User is not a member of this board");
    }
    userBoard.permission = permission;
    await this.userBoardRepository.save(userBoard);
  }

  async deleteBoard(boardId: number) {
    await this.boardRepository.update({ id: boardId }, { isDeleted: true });
  }
}
