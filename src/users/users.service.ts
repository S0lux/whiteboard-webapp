import { Injectable, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { UserRegisterDto } from "src/auth/dtos/UserRegisterDto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findUserById(id: number): Promise<User | null> {
    return (
      (await this.userRepository.findOne({
        where: { id },
      })) || null
    );
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return (
      (await this.userRepository.findOne({
        where: { username },
      })) || null
    );
  }

  async registerUser({ username, email, password }: UserRegisterDto): Promise<Partial<User>> {
    // Check if username is already taken
    const existingUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException("Username is already taken");
    }

    // Check if email is already taken
    const existingEmail = await this.userRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException("Email is already registered");
    }

    const newUser = new User({
      username,
      email,
      password,
    });

    const savedUser = await this.userRepository.save(newUser);
    const userWithoutPassword = { ...savedUser, hashedPassword: undefined, password: undefined };

    return userWithoutPassword;
  }
}
