import { Injectable, ConflictException, BadRequestException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { RegisterUserDto } from "src/auth/dtos/UserRegisterDto";
import { ChangePasswordDto } from "src/auth/dtos/ChangePasswordDto";
import * as argon2 from "argon2";
import { PasswordToken } from "src/email/email-password-reset/entities/password-token.entity";
import { UploaderService } from "src/uploader/uploader.interface";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordToken)
    private readonly passwordTokenRepository: Repository<PasswordToken>,
    @Inject(UploaderService)
    private readonly uploaderService: UploaderService,
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

  async resetPassword(token: string, newPassword: string): Promise<any> {
    const passwordToken = await this.passwordTokenRepository.findOne({
      where: { token },
    });

    if (passwordToken) {
      await this.passwordTokenRepository.delete(passwordToken.id);
    }

    if (!passwordToken || passwordToken.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired password token");
    }

    const user = await this.findUserById(passwordToken.userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    user.hashedPassword = await argon2.hash(newPassword);
    await this.userRepository.save(user);
    return { message: "Password reset successfully" };
  }

  async uploadAvatar(userId: number, file: Express.Multer.File): Promise<any> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const uploadApiResponse = await this.uploaderService.uploadFile(
      file,
      "avatars",
      `avatar_${userId}`,
    );

    const optimizedAvatar = await this.uploaderService.getFileUrl(uploadApiResponse!.public_id, {
      transformation: {
        width: 256,
        aspect_ratio: "1:1",
        crop: "fill",
        format: "webp",
      },
      version: uploadApiResponse!.version,
    });

    user.avatar = optimizedAvatar;
    await this.userRepository.save(user);

    return { message: "Avatar uploaded successfully" };
  }
}
