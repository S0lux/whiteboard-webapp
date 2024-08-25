import { Body, Controller, Get, Post, UseGuards, UsePipes } from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { AuthenticatedGuard } from "src/auth/guards/authenticated.guard";
import { CreateTeamDto, CreateTeamSchema } from "./dtos/CreateTeamDto";
import { ZodValidationPipe } from "src/shared/pipes/ZodValidationPipe";
import { AuthUser } from "src/shared/decorators/UserDecorator";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

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
}
