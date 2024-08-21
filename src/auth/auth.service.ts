import { Injectable } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import * as argon2 from "argon2";

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async validateUser(username: string, password: string): Promise<unknown> {
    const user = await this.usersService.findUserByUsername(username);
    if (user && (await argon2.verify(user.hashedPassword, password))) {
      const { hashedPassword, ...rest } = user;
      return rest;
    }
    return null;
  }
}
