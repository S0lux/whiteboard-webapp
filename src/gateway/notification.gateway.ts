import { OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WebSocketGateway, WebSocketServer, ConnectedSocket } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Team } from "src/teams/entities/team.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Repository } from "typeorm";

@WebSocketGateway()
export class NotificationGateway implements OnModuleInit {
  constructor(
    @InjectRepository(UserTeam) private readonly userTeamRepository: Repository<UserTeam>,
  ) { }

  @WebSocketServer()
  server: Server;

  onModuleInit() {
    this.server.on("connection", async (socket: Socket) => {
      const user = (socket.request as any).user;

      if (user) {
        socket.join(`user:${user.id}`);

        const teams = await this.getUserTeams(user.id);
        teams.forEach((team) => {
          socket.join(`team:${team.id}`);
        });
      }
    });
  }

  async removeUserFromTeamRoom(userId: number, teamId: number) {
    // This should contains only 1 socket
    const sockets = await this.server.in(`user:${userId}`).fetchSockets();
    sockets.forEach((socket) => {
      socket.leave(`team:${teamId}`);
    });
  }

  private async getUserTeams(userId: number): Promise<Team[]> {
    const relations = await this.userTeamRepository.find({
      where: { user: { id: userId } },
      relations: ["team"],
    });

    return relations.map((relation) => relation.team);
  }

  async getUserIdsInTeamRoom(teamId: number): Promise<number[]> {
    const sockets = await this.server.in(`team:${teamId}`).fetchSockets();
    const userIds = new Set<number>();

    for (const socket of sockets) {
      const userRoom = Array.from(socket.rooms).find((room) => room.startsWith("user:"));
      if (userRoom) {
        const userId = parseInt(userRoom.split(":")[1], 10);
        if (!isNaN(userId)) {
          userIds.add(userId);
        }
      }
    }

    return Array.from(userIds);
  }
}
