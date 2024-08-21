import { Injectable, ConflictException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { RegisterUserDto } from "src/auth/dtos/UserRegisterDto";
import { ChangePasswordDto } from "src/auth/dtos/ChangePasswordDto";
import * as argon2 from "argon2";

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

  async findUserByEmail(email: string): Promise<User | null> {
    return (
      (await this.userRepository.findOne({
        where: { email },
      })) || null
    );
  }

  async registerUser({ username, email, password }: RegisterUserDto): Promise<Partial<User>> {
    // Check if username is already taken
    const existingUsername = await this.findUserByUsername(username);
    if (existingUsername) {
      throw new ConflictException("Username is already taken");
    }

    // Check if email is already taken
    const existingEmail = await this.findUserByEmail(email);
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

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const isPasswordValid = await argon2.verify(user.hashedPassword, changePasswordDto.oldPassword);
    if (!isPasswordValid) {
      throw new BadRequestException("Invalid password");
    }

    user.hashedPassword = await argon2.hash(changePasswordDto.newPassword);
    await this.userRepository.save(user);
  }
}
