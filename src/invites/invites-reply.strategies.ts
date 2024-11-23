import { InviteStatus } from "src/shared/enums/invite-status.enum";
import { Invite } from "./entities/invite.entity";
import { InviteReplyStrategy } from "./invites-reply-strategy.interface";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Role } from "src/shared/enums/role.enum";
import { Permission } from "src/shared/enums/permission.enum";
import { UserBoard } from "src/boards/entities/user_board.entity";
import { Board } from "src/boards/entities/board.entity";

@Injectable()
export class AcceptInviteStrategy implements InviteReplyStrategy {
  constructor(
    @InjectRepository(UserTeam)
    private userTeamRepository: Repository<UserTeam>,
    @InjectRepository(UserBoard)
    private userBoardRepository: Repository<UserBoard>,
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
  ) { }

  async execute(invite: Invite): Promise<void> {
    await this.addToTeam(invite);
    invite.status = InviteStatus.ACCEPTED;
  }

  private async addToTeam(invite: Invite): Promise<void> {
    const userTeam = new UserTeam();
    userTeam.user = invite.recipient;
    userTeam.team = invite.team;
    userTeam.role = Role.MEMBER;
    userTeam.permission = Permission.VIEW;
    await this.userTeamRepository.save(userTeam);

    const boards = await this.boardRepository.find({
      where: { team: invite.team },
    });
    boards.forEach(async board => {
      const userBoard = new UserBoard({
        board,
        user: invite.recipient,
        permission: Permission.VIEW,
      });
      await this.userBoardRepository.save(userBoard);
    });
  }
}

@Injectable()
export class RejectInviteStrategy implements InviteReplyStrategy {
  async execute(invite: Invite): Promise<void> {
    invite.status = InviteStatus.REJECTED;
  }
}
