import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailToken } from "src/email/entities/email-token.entity";
import { EmailVerificationService } from "./email-verification/email-verification.service";
import { User } from "src/users/entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([EmailToken]), TypeOrmModule.forFeature([User])],
  providers: [EmailService, EmailVerificationService],
  exports: [EmailVerificationService, EmailService],
})
export class EmailModule {}
