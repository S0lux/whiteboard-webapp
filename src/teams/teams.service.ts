import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Team } from "./entities/team.entity";
import { In, Repository } from "typeorm";
import { CreateTeamDto } from "./dtos/CreateTeamDto";
import { User } from "src/users/entities/user.entity";
import { UserTeam } from "./entities/user-team-relation.entity";
import { Role } from "../shared/role.enum";
import { UploaderService } from "src/uploader/uploader.interface";
import { Invite } from "../invites/entities/invite.entity";
import { InviteStatus } from "src/shared/invite-status.enum";
import { getPlanDetails } from "src/shared/plan_details.helper";
import { NotificationsService } from "src/notifications/notifications.service";
import { NotificationType } from "src/shared/notification.enum";

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
    private readonly notificationService: NotificationsService,
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

    const newTeam = new Team({ name: data.name, description: data.description });
    await this.teamRepository.save(newTeam);

    const userTeams = new UserTeam();
    userTeams.user = user;
    userTeams.team = newTeam;
    userTeams.role = Role.OWNER;

    await this.userTeamRepository.save(userTeams);

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
    await this.userTeamRepository.delete({ team: { id: teamId } });
    await this.teamRepository.delete({ id: teamId });

    return { message: "Team deleted" };
  }

  async setLogo(teamId: number, logo: Express.Multer.File) {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new BadRequestException("Team not found");
    }

    const logoPublicId = await this.uploaderService.uploadFile(
      logo,
      "team_logos",
      teamId.toString(),
    );
    const optimizedLogoUrl = await this.uploaderService.getFileUrl(logoPublicId, {
      transformation: {
        width: 256,
        aspect_ratio: "1:1",
        crop: "fill",
        format: "webp",
      },
    });

    team.logo = optimizedLogoUrl;
    await this.teamRepository.save(team);

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

    await this.notificationService.createNotification(
      recipient.id,
      `You have been invited to join ${team.name}`,
      NotificationType.INVITE,
      newInvite.id,
    );

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

  async removeMember(teamId: number, userId: number) {
    const userTeam = await this.userTeamRepository.findOne({
      where: { team: { id: teamId }, user: { id: userId } },
    });

    if (!userTeam) {
      throw new BadRequestException("User not found in team");
    }

    if (userTeam.role === Role.OWNER) {
      throw new BadRequestException("Owner cannot be removed");
    }

    await this.userTeamRepository.delete({ team: { id: teamId }, user: { id: userId } });

    // Notify team members to update their team members list
    const teamMemberRelations = await this.userTeamRepository.find({
      where: { team: { id: teamId } },
      relations: ["user"],
    });

    const teamMembers = teamMemberRelations.map((relation) => relation.user.id.toString());
    this.notificationService.notifyTeamMemberUpdated(teamMembers, teamId.toString());

    // Notify the removed user
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    this.notificationService.createNotification(
      userId,
      `You have been removed from the team ${team?.name}`,
      NotificationType.BASIC,
    );

    this.notificationService.notifyRemovedFromTeam(userId.toString(), teamId.toString());

    return { message: "Member removed" };
  }
}
