import { OnModuleInit } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { Invite } from "src/invites/entities/invite.entity";

@WebSocketGateway()
export class InvitationGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  onModuleInit() {
    this.server.on("connection", (socket) => {
      // console.log("New connection:", socket.id);
      // console.log((socket.request as any).user);
    });
  }

  notifyNewInvitation(userId: string, invitation: Partial<Invite>) {
    this.server.to(`user:${userId}`).emit("newInvitation", invitation);
  }
}
