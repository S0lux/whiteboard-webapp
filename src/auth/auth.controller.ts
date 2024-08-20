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
} from "@nestjs/common";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { AuthenticatedGuard } from "./guards/authenticated.guard";
import { UsersService } from "src/users/users.service";
import { ZodValidationPipe } from "src/shared/pipes/ZodValidationPipe";
import { UserRegisterDto, UserRegisterSchema } from "./dtos/UserRegisterDto";

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

  @UseGuards(AuthenticatedGuard)
  @Get("me")
  async getMe(@Request() req) {
    const { hashedPassword, ...rest } = req.user;
    return rest;
  }

  @UsePipes(new ZodValidationPipe(UserRegisterSchema))
  @Post("register")
  async register(@Body() userDto: UserRegisterDto) {
    return this.usersService.registerUser(userDto);
  }
}
