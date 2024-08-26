import { Injectable } from "@nestjs/common";
import { EmailService } from "../email.service";
import { InjectRepository } from "@nestjs/typeorm";
import { PasswordToken } from "./entities/password-token.entity";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "fs";
import { join } from "path";

@Injectable()
export class EmailPasswordResetService {
  private emailTextTemplate: string;
  private emailHtmlTemplate: string;

  constructor(
    private readonly emailService: EmailService,
    @InjectRepository(PasswordToken)
    private readonly passwordTokenRepository: Repository<PasswordToken>,
    private readonly configService: ConfigService,
  ) {
    this.emailTextTemplate = readFileSync(
      join(__dirname, "..", "..", "templates", "password-reset.txt"),
      "utf8",
    );

    this.emailHtmlTemplate = readFileSync(
      join(__dirname, "..", "..", "templates", "password-reset.html"),
      "utf8",
    );
  }

  private async createPasswordToken(userId: number): Promise<PasswordToken> {
    const passwordToken = new PasswordToken({ userId });
    return await this.passwordTokenRepository.save(passwordToken);
  }

  async sendPasswordResetEmail(user: { email: string; id: number }): Promise<any> {
    const passwordToken = await this.createPasswordToken(user.id);
    const resetLink = `${this.configService.getOrThrow("FRONTEND_URL")}/reset-password?token=${passwordToken.token}`;

    const html = this.emailHtmlTemplate.replace(/{{resetLink}}/g, resetLink);
    const text = this.emailTextTemplate.replace(/{{resetLink}}/g, resetLink);

    const mailOptions = {
      from: `Teamscribe Support <noreply@teamscribe.app>`,
      to: user.email,
      subject: "Reset Your Password",
      html,
      text,
    };

    await this.emailService.send(mailOptions);
    return { message: "Password reset email sent successfully." };
  }
}
