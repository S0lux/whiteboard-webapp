import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { AuthenticatedGuard } from "src/auth/guards/authenticated.guard";
import { CreateTeamDto, CreateTeamSchema } from "./dtos/CreateTeamDto";
import { ZodValidationPipe } from "src/shared/pipes/zod-validation.pipe";
import { AuthUser } from "src/shared/decorators/user.decorator";
import { TeamRoles } from "src/shared/decorators/roles.decorator";
import { TeamRoleGuard } from "src/shared/guards/team-role.guard";
import { Role } from "src/shared/enums/role.enum";
import { FileInterceptor } from "@nestjs/platform-express";
import { InviteMemberDto, InviteMemberSchema } from "./dtos/InviteMemberDto";
import { User } from "src/users/entities/user.entity";
import { EmailInvitationService } from "src/email/email-invitation/email-invitation.service";
import { UpdateTeamDto, UpdateTeamSchema } from "./dtos/UpdateTeamDto";
import { NotificationsService } from "src/notifications/notifications.service";
import { Event } from "src/shared/enums/event.enum";
import { NotificationTarget } from "src/shared/enums/notification-target.enum";
import { NotificationType } from "src/shared/enums/notification.enum";

@Controller("teams")
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly emailInvitationService: EmailInvitationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @UseGuards(AuthenticatedGuard)
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateTeamSchema)) createTeamDto: CreateTeamDto,
    @AuthUser() user,
  ) {
    return await this.teamsService.createTeam(createTeamDto, user);
  }

  @UseGuards(AuthenticatedGuard)
  @Get()
  async findAll(@AuthUser() user) {
    return await this.teamsService.findAll(user);
  }

  @TeamRoles(Role.OWNER)
  @UseGuards(TeamRoleGuard)
  @Delete(":teamId")
  async delete(@Param("teamId", ParseIntPipe) teamId: number) {
    const oldTeam = await this.teamsService.deleteTeam(teamId);

    this.notificationsService.sendNotification(
      teamId,
      NotificationTarget.TEAM,
      NotificationType.BASIC,
      {
        content: `${oldTeam.name} has been disbanded`,
      },
    );

    this.notificationsService.sendEvent(
      teamId,
      NotificationTarget.TEAM,
      Event.REMOVED_FROM_TEAM,
      teamId.toString(),
    );

    this.notificationsService.disbandRoom(teamId.toString());

    return { message: "Team has been deleted" };
  }

  @TeamRoles(Role.OWNER)
  @UseGuards(TeamRoleGuard)
  @UseInterceptors(FileInterceptor("logo"))
  @Post(":teamId/logo")
  async uploadLogo(
    @Param("teamId", ParseIntPipe) teamId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 256 * 1024 }),
          new FileTypeValidator({ fileType: ".(png|jpeg|jpg|webp)" }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.teamsService.setLogo(teamId, file);
  }

  @TeamRoles(Role.OWNER)
  @UseGuards(TeamRoleGuard)
  @Post(":teamId/members")
  async invite(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body(new ZodValidationPipe(InviteMemberSchema)) body: InviteMemberDto,
    @AuthUser("email") senderEmail: string,
  ) {
    const { recipientEmail } = body;
    const invitation = await this.teamsService.createInvitation(
      senderEmail,
      recipientEmail,
      teamId,
    );

    await this.emailInvitationService.sendInvitationEmail(
      recipientEmail,
      invitation.team.name,
      invitation.id,
    );

    return { message: "Invitation sent" };
  }

  @TeamRoles(Role.OWNER, Role.MEMBER)
  @UseGuards(TeamRoleGuard)
  @Get(":teamId/members")
  async getMembers(@Param("teamId", ParseIntPipe) teamId: number) {
    return await this.teamsService.getMembers(teamId);
  }

  @UseGuards(AuthenticatedGuard)
  @Delete(":teamId/members/:userId")
  async removeMember(
    @AuthUser("id", ParseIntPipe) requesterId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("userId", ParseIntPipe) userId: number,
  ) {
    return await this.teamsService.removeMember(teamId, userId, requesterId);
  }

  @TeamRoles(Role.OWNER)
  @UseGuards(TeamRoleGuard)
  @Patch(":teamId/")
  async updateTeam(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body(new ZodValidationPipe(UpdateTeamSchema)) body: UpdateTeamDto,
  ) {
    return await this.teamsService.updateTeam({ teamId, ...body });
  }
}
