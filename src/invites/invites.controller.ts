import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { InvitesService } from "./invites.service";
import { AuthenticatedGuard } from "src/auth/guards/authenticated.guard";
import { AuthUser } from "src/shared/decorators/user.decorator";

@Controller("invites")
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @UseGuards(AuthenticatedGuard)
  @Get(":inviteId")
  async getInvite(
    @Param("inviteId", ParseIntPipe) inviteId: number,
    @AuthUser("id") requesterId: number,
  ) {
    const invite = await this.invitesService.getInvite(inviteId, requesterId);
    const response = {
      id: invite.id,
      status: invite.status,
      expiresAt: invite.expiresAt,
      team: invite.team,
    };
    return response;
  }

  @UseGuards(AuthenticatedGuard)
  @Patch(":inviteId")
  async replyToInvite(
    @Param("inviteId", ParseIntPipe) inviteId: number,
    @AuthUser("id") requesterId: number,
    @Body("status") status: string,
  ) {
    if (!status) throw new BadRequestException("Status is required");
    return await this.invitesService.replyToInvite(inviteId, requesterId, status);
  }
}
