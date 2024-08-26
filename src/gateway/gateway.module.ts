import { Module } from "@nestjs/common";
import { InvitationGateway } from "./invitation.gateway";

@Module({
  providers: [InvitationGateway],
  exports: [InvitationGateway],
})
export class GatewayModule {}
