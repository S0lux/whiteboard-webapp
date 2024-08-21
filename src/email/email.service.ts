import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import FormData from "form-data";
import Mailgun, { MailgunMessageData } from "mailgun.js";
import { IMailgunClient } from "mailgun.js/Interfaces";

@Injectable()
export class EmailService {
  private readonly mg: IMailgunClient;

  constructor(private readonly configService: ConfigService) {
    const mailgun = new Mailgun(FormData);
    this.mg = mailgun.client({
      username: "api",
      key: this.configService.getOrThrow("MAILGUN_API_KEY"),
    });
  }

  async send(options: MailgunMessageData): Promise<any> {
    try {
      const response = await this.mg.messages.create(
        this.configService.getOrThrow("MAILGUN_DOMAIN"),
        options,
      );
      return response;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
}
