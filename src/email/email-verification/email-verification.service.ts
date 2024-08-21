import { Injectable, UnauthorizedException } from "@nestjs/common";
import { EmailService } from "../email.service";
import { EmailToken } from "src/email/entities/email-token.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @InjectRepository(EmailToken)
    private readonly emailTokenRepository: Repository<EmailToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async createEmailToken(userId: number): Promise<EmailToken> {
    const emailToken = new EmailToken({ userId });
    return await this.emailTokenRepository.save(emailToken);
  }

  async verifyEmailToken(token: string): Promise<any> {
    const emailToken = await this.emailTokenRepository.findOne({
      where: { token },
    });

    if (!emailToken || emailToken.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired email token");
    }

    await this.userRepository.update(emailToken.userId, { emailVerified: true });
    await this.emailTokenRepository.delete(emailToken.id);
    return { message: "Email verified succesfully." };
  }

  async sendVerificationEmail(user: { email: string; id: number }): Promise<any> {
    const emailToken = await this.createEmailToken(user.id);

    const mailOptions = {
      from: `Teamscribe Team <noreply@${this.configService.getOrThrow("MAILGUN_DOMAIN")}>`,
      to: user.email,
      subject: "Activate your account",
      text: `Please activate your account by clicking this link: ${this.configService.getOrThrow("FRONTEND_URL")}/verify-email?token=${emailToken.token}`,
    };

    await this.emailService.send(mailOptions);
    return { message: "Verification email sent." };
  }
}
