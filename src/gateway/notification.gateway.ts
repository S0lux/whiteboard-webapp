import { OnModuleInit } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { Invite } from "src/invites/entities/invite.entity";

@WebSocketGateway()
export class NotificationGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  onModuleInit() {
    this.server.on("connection", (socket) => {
      const user = (socket.request as any).user;
      if (user) {
        socket.join(`user:${user.id}`);
      }
    });
  }

  notifyNewInvitation(userId: string, invitation: Partial<Invite>) {
    this.server.to(`user:${userId}`).emit("new_invitation", invitation);
  }

  notifyAccountUpdated(userId: string) {
    this.server.to(`user:${userId}`).emit("account_updated");
  }
}
