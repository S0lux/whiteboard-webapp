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
  ValidationPipe,
  BadRequestException,
  Res,
} from "@nestjs/common";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { AuthenticatedGuard } from "./guards/authenticated.guard";
import { UsersService } from "src/users/users.service";
import { ZodValidationPipe } from "src/shared/pipes/ZodValidationPipe";
import { RegisterUserDto, RegisterUserSchema } from "./dtos/UserRegisterDto";
import { ChangePasswordDto, ChangePasswordSchema } from "./dtos/ChangePasswordDto";
import { AuthUser } from "src/shared/decorators/UserDecorator";
import { EmailVerificationService } from "src/email/email-verification/email-verification.service";
import { EmailPasswordResetService } from "src/email/email-password-reset/email-password-reset.service";
import { Response } from "express";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly emailPasswordResetService: EmailPasswordResetService,
  ) {}

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
    const registeredUser = await this.usersService.registerUser(userDto);
    return await this.emailVerificationService.sendVerificationEmail({
      email: registeredUser.email!!,
      id: registeredUser.id!!,
    });
  }

  @UseGuards(AuthenticatedGuard)
  @Get("me")
  async getMe(@AuthUser() user) {
    const { hashedPassword, ...rest } = user;
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

  @UsePipes(new ValidationPipe())
  @Post("verify-email")
  @HttpCode(200)
  async verifyEmail(@Body("token") token: string) {
    if (!token) throw new BadRequestException("Token is required");
    return await this.emailVerificationService.verifyEmailToken(token);
  }

  @UseGuards(AuthenticatedGuard)
  @Get("resend-email")
  async resendEmail(@AuthUser() user) {
    if (user.emailVerified) throw new BadRequestException("Email is already verified");
    return await this.emailVerificationService.sendVerificationEmail({
      email: user.email,
      id: user.id,
    });
  }

  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body("email") email: string, @Res() res: Response) {
    if (!email) throw new BadRequestException("Email is required");
    res.send({ message: "Request received." });
    const user = await this.usersService.findUserByEmail(email);
    if (user) await this.emailPasswordResetService.sendPasswordResetEmail(user);
  }
}
