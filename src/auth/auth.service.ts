import { Injectable } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

const argon2 = require("argon2");

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async validateUser(username: string, password: string): Promise<unknown> {
    const user = await this.usersService.findUserByUsername(username);
    if (user && argon2.verify(user.hashedPassword, password)) {
      const { hashedPassword, ...rest } = user;
      return rest;
    }
    return null;
  }
}
