import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersModule } from "src/users/users.module";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "./local.strategy";
import { AuthController } from "./auth.controller";
import { SessionSerializer } from "./session.serializer";
import { EmailModule } from "src/email/email.module";
import { EmailVerificationService } from "src/email/email-verification/email-verification.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailToken } from "src/email/email-verification/entities/email-token.entity";
import { User } from "src/users/entities/user.entity";
import { EmailPasswordResetService } from "src/email/email-password-reset/email-password-reset.service";
import { PasswordToken } from "src/email/email-password-reset/entities/password-token.entity";
import { GatewayModule } from "src/gateway/gateway.module";
import { NotificationsModule } from "src/notifications/notifications.module";

@Module({
  providers: [
    AuthService,
    EmailVerificationService,
    EmailPasswordResetService,
    LocalStrategy,
    SessionSerializer,
  ],
  imports: [
    UsersModule,
    EmailModule,
    PassportModule.register({ session: true }),
    TypeOrmModule.forFeature([EmailToken, User, PasswordToken]),
    GatewayModule,
    NotificationsModule,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
