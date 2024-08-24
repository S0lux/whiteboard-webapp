import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailToken } from "./email-verification/entities/email-token.entity";
import { EmailVerificationService } from "./email-verification/email-verification.service";
import { User } from "src/users/entities/user.entity";
import { EmailPasswordResetService } from "./email-password-reset/email-password-reset.service";
import { PasswordToken } from "./email-password-reset/entities/password-token.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailToken]),
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([PasswordToken]),
  ],
  providers: [EmailService, EmailVerificationService, EmailPasswordResetService],
  exports: [EmailVerificationService, EmailService],
})
export class EmailModule {}
