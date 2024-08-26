import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { PasswordToken } from "src/email/email-password-reset/entities/password-token.entity";
import { UploaderModule } from "src/uploader/uploader.module";

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
  imports: [TypeOrmModule.forFeature([User, PasswordToken]), UploaderModule],
})
export class UsersModule {}
