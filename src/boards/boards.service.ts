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

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserTeam) private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(Board) private readonly boardRepository: Repository<Board>,
    @InjectRepository(Team) private readonly teamRepository: Repository<Team>
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
    if (userTeam.role !== "OWNER") {
      throw new BadRequestException("Only team owners can create boards");
    }

    const team = await this.teamRepository.findOne({ where: { id: data.teamId } })
    if (!team) {
      throw new BadRequestException("Team not found")
    }
    const newBoard = new Board({ name: data.name, team });
    await this.boardRepository.save(newBoard);
  }

  async getBoardById(id: string) {
    return await this.boardRepository.findOne({ where: { id: Number(id) }, relations: ["paths", "shapes"] });
  }

}
