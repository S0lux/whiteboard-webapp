import { PassportSerializer } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { User } from "src/users/entities/user.entity";

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(user: User, done: (err: Error | null, id?: number) => void): void {
    done(null, user.id);
  }

  async deserializeUser(
    userId: number,
    done: (err: Error | null, user?: User) => void,
  ): Promise<void> {
    try {
      const user = await this.usersService.findUserById(userId);
      done(null, user!!);
    } catch (error) {
      done(error);
    }
  }
}
