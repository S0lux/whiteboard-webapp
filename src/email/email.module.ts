import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailToken } from "./email-verification/entities/email-token.entity";
import { EmailVerificationService } from "./email-verification/email-verification.service";
import { User } from "src/users/entities/user.entity";
import { EmailPasswordResetService } from "./email-password-reset/email-password-reset.service";
import { PasswordToken } from "./email-password-reset/entities/password-token.entity";
import { EmailInvitationService } from "./email-invitation/email-invitation.service";
import { GatewayModule } from "src/gateway/gateway.module";
import { NotificationsModule } from "src/notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailToken, User, PasswordToken]),
    GatewayModule,
    NotificationsModule,
  ],
  providers: [
    EmailService,
    EmailVerificationService,
    EmailPasswordResetService,
    EmailInvitationService,
  ],
  exports: [EmailVerificationService, EmailService, EmailInvitationService],
})
export class EmailModule {}
