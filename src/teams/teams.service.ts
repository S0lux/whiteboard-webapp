import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Team } from "./entities/team.entity";
import { Repository } from "typeorm";
import { CreateTeamDto } from "./dtos/CreateTeamDto";
import { User } from "src/users/entities/user.entity";
import { UserTeam } from "./entities/user-team-relation.entity";

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
  ) {}

  async createTeam(data: CreateTeamDto, creator: { id: number }) {
    const user = await this.userRepository.findOne({ where: { id: creator.id } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const canCreateTeam = await this.canCreateTeam(user);
    if (!canCreateTeam) {
      throw new BadRequestException("You reached the maximum number of teams you can create");
    }

    const newTeam = new Team({ name: data.name });
    await this.teamRepository.save(newTeam);

    const userTeams = new UserTeam();
    userTeams.user = user;
    userTeams.team = newTeam;
    userTeams.role = "owner";

    await this.userTeamRepository.save(userTeams);

    return newTeam;
  }

  async canCreateTeam(user: User) {
    const userTeams = await this.userTeamRepository.find({
      where: { user: { id: user.id }, role: "owner" },
    });

    return userTeams.length < user.maxOwnedTeams;
  }
}
