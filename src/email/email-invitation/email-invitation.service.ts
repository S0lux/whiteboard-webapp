import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../email.service";
import { readFileSync } from "fs";
import { join } from "path";

@Injectable()
export class EmailInvitationService {
  private readonly emailHtmlTemplate: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.emailHtmlTemplate = readFileSync(
      join(__dirname, "..", "..", "templates", "invitation.html"),
      "utf8",
    );
  }

  async sendInvitationEmail(email: string, teamName: string, inviteId: number) {
    const inviteLink = `${this.configService.getOrThrow("FRONTEND_URL")}/invites/${inviteId}`;

    const html = this.emailHtmlTemplate
      .replace(/{{teamName}}/g, teamName)
      .replace(/{{inviteLink}}/g, inviteLink);

    const mailOptions = {
      from: `Teamscribe Support <noreply@teamscribe.app>`,
      to: email,
      subject: "You've been invited to join a team!",
      html,
    };

    await this.emailService.send(mailOptions);
    return { message: "Invitation email sent successfully" };
  }
}
