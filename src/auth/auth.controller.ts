import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  UsePipes,
  Body,
  InternalServerErrorException,
  HttpCode,
  Put,
} from "@nestjs/common";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { AuthenticatedGuard } from "./guards/authenticated.guard";
import { UsersService } from "src/users/users.service";
import { ZodValidationPipe } from "src/shared/pipes/ZodValidationPipe";
import { RegisterUserDto, RegisterUserSchema } from "./dtos/UserRegisterDto";
import { ChangePasswordDto, ChangePasswordSchema } from "./dtos/ChangePasswordDto";
import { AuthUser } from "src/shared/decorators/UserDecorator";
import { User } from "src/users/entities/user.entity";
import { number } from "zod";

@Controller("auth")
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(LocalAuthGuard)
  @Post("login")
  @HttpCode(200)
  async login(@Request() req) {
    const { hashedPassword, ...rest } = req.user;
    return rest;
  }

  @UseGuards(AuthenticatedGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(@Request() req) {
    req.logout((err) => {
      if (err) {
        throw new InternalServerErrorException();
      }
    });
  }

  @UsePipes(new ZodValidationPipe(RegisterUserSchema))
  @Post("register")
  async register(@Body() userDto: RegisterUserDto) {
    return this.usersService.registerUser(userDto);
  }

  @UseGuards(AuthenticatedGuard)
  @Get("me")
  async getMe(@Request() req) {
    const { hashedPassword, ...rest } = req.user;
    return rest;
  }

  @UseGuards(AuthenticatedGuard)
  @Put("change-password")
  async changePassword(
    @Body(new ZodValidationPipe(ChangePasswordSchema)) changePasswordDto: ChangePasswordDto,
    @AuthUser("id") userId: number,
  ) {
    return await this.usersService.changePassword(userId, changePasswordDto);
  }
}
