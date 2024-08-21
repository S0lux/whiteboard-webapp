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
import { EmailToken } from "src/email/entities/email-token.entity";
import { User } from "src/users/entities/user.entity";

@Module({
  providers: [AuthService, EmailVerificationService, LocalStrategy, SessionSerializer],
  imports: [
    UsersModule,
    EmailModule,
    PassportModule.register({ session: true }),
    TypeOrmModule.forFeature([EmailToken]),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController],
})
export class AuthModule {}
