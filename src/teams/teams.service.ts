import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { InviteStatus } from "src/shared/enums/invite-status.enum";
import { getPlanDetails } from "src/shared/plan_details.helper";
import { UploaderService } from "src/uploader/uploader.interface";
import { User } from "src/users/entities/user.entity";
import { In, Repository } from "typeorm";
import { Invite } from "../invites/entities/invite.entity";
import { Role } from "../shared/enums/role.enum";
import { CreateTeamDto } from "./dtos/CreateTeamDto";
import { Team } from "./entities/team.entity";
import { UserTeam } from "./entities/user-team-relation.entity";
import { Permission } from "src/shared/enums/permission.enum";
import { Board } from "src/boards/entities/board.entity";
import { UpdatePermissionDto } from "./dtos/UpdatePermissionDto";
import { permission } from "process";

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(Invite)
    private readonly inviteRepository: Repository<Invite>,
    @Inject(UploaderService)
    private readonly uploaderService: UploaderService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
  ) { }

  async createTeam(data: CreateTeamDto, creator: { id: number }) {
    const user = await this.userRepository.findOne({ where: { id: creator.id } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const canCreateTeam = await this.canCreateTeam(user);
    if (!canCreateTeam) {
      throw new BadRequestException("You reached the maximum number of teams you can create");
    }

    const newTeam = new Team({ name: data.name, description: data.description });
    await this.teamRepository.save(newTeam);

    const userTeams = new UserTeam();
    userTeams.user = user;
    userTeams.team = newTeam;
    userTeams.role = Role.OWNER;
    userTeams.permission = Permission.EDIT;

    const result = await this.userTeamRepository.save(userTeams);
    this.eventEmitter.emit("team.created", { teamId: result.id, userId: user.id });

    return newTeam;
  }

  async findById(id: number) {
    return await this.teamRepository.findOne({ where: { id } });
  }

  async canCreateTeam(user: User) {
    const userTeams = await this.userTeamRepository.find({
      where: { user: { id: user.id }, role: Role.OWNER },
    });

    const userPlan = getPlanDetails(user.accountPlan);

    return userTeams.length < userPlan.maxOwnedTeams;
  }

  async findAll(user: { id: number }) {
    const userTeams = await this.userTeamRepository.find({
      where: { user: { id: user.id } },
      relations: ["team"],
    });

    // Find the team owner of each team in userTeams
    const teamIds = userTeams.map((userTeam) => userTeam.team.id);
    const teamOwners = (
      await this.userTeamRepository.find({
        where: { team: { id: In(teamIds) }, role: Role.OWNER },
        relations: ["user", "team"],
      })
    ).map((userTeam) => {
      return { teamId: userTeam.team.id, accountPlan: userTeam.user.accountPlan };
    });

    return userTeams.map((userTeam) => {
      const teamOwner = teamOwners.find((owner) => owner.teamId === userTeam.team.id);
      return {
        ...userTeam.team,
        role: userTeam.role,
        plan: teamOwner!.accountPlan,
      };
    });
  }

  async getRoleForTeam(teamId: number, userId: number) {
    const userTeam = await this.userTeamRepository.findOne({
      where: { team: { id: teamId }, user: { id: userId } },
    });

    return userTeam?.role;
  }

  async deleteTeam(teamId: number) {
    const oldTeam = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!oldTeam) {
      throw new BadRequestException("Team not found");
    }

    this.eventEmitter.emit("team.disbanded", { teamId, teamName: oldTeam.name });

    await this.userTeamRepository.delete({ team: { id: teamId } });
    await this.inviteRepository.delete({ team: { id: teamId } });
    await this.teamRepository.delete({ id: teamId });
    if (oldTeam.logoPublicId) await this.uploaderService.deleteFile(oldTeam.logoPublicId);

    return oldTeam;
  }

  async setLogo(teamId: number, logo: Express.Multer.File) {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new BadRequestException("Team not found");
    }

    const uploadResponse = await this.uploaderService.uploadFile(
      logo,
      "team_logos",
      teamId.toString(),
    );

    team.logoPublicId = uploadResponse!.public_id;
    team.logo = this.uploaderService.getFileUrl(team.logoPublicId, {
      width: 256,
      aspect_ratio: 1,
      format: "webp",
      crop: "fill",
      version: uploadResponse!.version,
    });

    await this.teamRepository.save(team);
    this.eventEmitter.emit("team.updated", { teamId });

    return { message: "Logo uploaded" };
  }

  async createInvitation(
    senderEmail: string,
    recipientEmail: string,
    teamId: number,
  ): Promise<Invite> {
    if (senderEmail === recipientEmail) {
      throw new BadRequestException("You cannot invite yourself");
    }

    const sender = await this.userRepository.findOne({ where: { email: senderEmail } });
    if (!sender) {
      throw new BadRequestException("Sender not found");
    }

    const recipient = await this.userRepository.findOne({ where: { email: recipientEmail } });
    if (!recipient) {
      throw new BadRequestException("Recipient not found");
    }

    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new BadRequestException("Team not found");
    }

    const existingInvite = await this.inviteRepository.findOne({
      where: {
        team: { id: teamId },
        recipient: { id: recipient.id },
        status: InviteStatus.PENDING,
      },
    });

    if (existingInvite) {
      throw new ConflictException("Invite already sent");
    }

    const invite = new Invite();
    invite.sender = sender;
    invite.recipient = recipient;
    invite.team = team;

    const newInvite = await this.inviteRepository.save(invite);

    this.eventEmitter.emit("invite.created", {
      inviteId: newInvite.id,
      userId: recipient.id,
      teamName: team.name,
    });

    return newInvite;
  }

  async getMembers(teamId: number) {
    const teamRelations = await this.userTeamRepository.find({
      where: { team: { id: teamId } },
      relations: ["user"],
    });

    const currentMembers = teamRelations.map((relation) => {
      const member = {
        id: relation.user.id,
        name: relation.user.username,
        email: relation.user.email,
        avatar: relation.user.avatar,
        role: relation.role,
        permission: relation.permission
      };

      return member;
    });

    const invites = await this.inviteRepository.find({
      where: { team: { id: teamId }, status: InviteStatus.PENDING },
      relations: ["recipient"],
    });

    const pendingMembers = invites.map((invite) => {
      return {
        id: invite.recipient.id,
        name: invite.recipient.username,
        email: invite.recipient.email,
        avatar: invite.recipient.avatar,
      };
    });

    return { currentMembers, pendingMembers };
  }

  async removeMember(teamId: number, memberId: number, requesterId: number) {
    const userToBeRemoved = await this.userTeamRepository.findOne({
      where: { team: { id: teamId }, user: { id: memberId } },
    });

    if (!userToBeRemoved) {
      throw new BadRequestException("User not found in team");
    }

    if (userToBeRemoved.role === Role.OWNER) {
      throw new BadRequestException("Owner cannot be removed");
    }

    const requester = await this.userTeamRepository.findOne({
      where: { team: { id: teamId }, user: { id: requesterId } },
    });

    if (!requester) {
      throw new BadRequestException("Requester not found in team");
    }

    // Only the owner can remove members or the member itself
    if (requester.role !== Role.OWNER && requesterId !== memberId) {
      throw new BadRequestException("Only the owner can remove members");
    }

    await this.userTeamRepository.delete({ team: { id: teamId }, user: { id: memberId } });
    const team = await this.teamRepository.findOne({ where: { id: teamId } });

    this.eventEmitter.emit("team.removedMember", {
      teamId,
      userId: memberId,
      teamName: team?.name || "Unknown",
    });

    return { message: "Member removed" };
  }

  async updateTeam({
    teamId,
    newName,
    newDescription,
  }: {
    teamId: number;
    newName?: string;
    newDescription?: string;
  }) {
    let updateName;
    let updateDescription;

    const team = await this.teamRepository.findOne({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    if (newName !== team.name) {
      updateName = this.teamRepository.update({ id: teamId }, { name: newName });
    }

    if (updateDescription !== team.description) {
      updateDescription = this.teamRepository.update(
        { id: Number(teamId) },
        { description: newDescription },
      );
    }

    await Promise.all([updateName, updateDescription]);

    if (newName !== team.name) {
      this.eventEmitter.emit("team.renamed", { teamId, newName, oldName: team.name });
    }

    this.eventEmitter.emit("team.updated", { teamId });
  }

  async getTeamBoards(teamId: number) {
    const teamBoards = await this.boardRepository.find({
      where: { team: { id: teamId }, isDeleted: false },
      relations: ["owner", "team", "paths", "shapes"],
    });

    return teamBoards;
  }

  async updatePermission(updatePermissionDto: UpdatePermissionDto) {
    const userTeam = await this.userTeamRepository.findOne({
      where: { team: { id: updatePermissionDto.teamId }, user: { id: updatePermissionDto.userId } },
      relations: ["user"],
    })
    if (!userTeam) {
      throw new BadRequestException("User not found in team")
    }

    userTeam.permission = updatePermissionDto.permission
    await this.userTeamRepository.save(userTeam)
    return { message: "Permission updated" }
  }
}
