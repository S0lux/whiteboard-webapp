import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
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
import { Role } from "src/shared/role.enum";
import { FileInterceptor } from "@nestjs/platform-express";
import { InviteMemberDto, InviteMemberSchema } from "./dtos/InviteMemberDto";
import { UsersService } from "src/users/users.service";
import { User } from "src/users/entities/user.entity";

@Controller("teams")
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly usersService: UsersService,
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
  async delete(@Param("teamId", new ParseIntPipe()) teamId: number) {
    return await this.teamsService.deleteTeam(teamId);
  }

  @TeamRoles(Role.OWNER)
  @UseGuards(TeamRoleGuard)
  @UseInterceptors(FileInterceptor("logo"))
  @Post(":teamId/logo")
  async uploadLogo(
    @Param("teamId", new ParseIntPipe()) teamId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 256 * 1024 }),
          new FileTypeValidator({ fileType: ".(png|jpeg|jpg)" }),
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
    @Param("teamId", new ParseIntPipe()) teamId: number,
    @Body(new ZodValidationPipe(InviteMemberSchema)) body: InviteMemberDto,
    @AuthUser("email") senderEmail: string,
  ) {
    const { recipientEmail } = body;
    await this.teamsService.createInvitation(senderEmail, recipientEmail, teamId);

    return { message: "Invitation sent" };
  }
}
