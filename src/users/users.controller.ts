import {
  Controller,
  FileTypeValidator,
  ForbiddenException,
  HttpCode,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthUser } from "src/shared/decorators/user.decorator";
import { AuthenticatedGuard } from "src/auth/guards/authenticated.guard";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthenticatedGuard)
  @Post(":id/avatar")
  @UseInterceptors(FileInterceptor("avatar"))
  @HttpCode(200)
  async uploadAvatar(
    @Param("id", new ParseIntPipe()) id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 256 * 1024 }),
          new FileTypeValidator({ fileType: ".(png|jpeg|jpg)" }),
        ],
      }),
    )
    file: Express.Multer.File,
    @AuthUser() user,
  ) {
    if (user.id !== id) {
      throw new ForbiddenException("You can only upload an avatar for your own account");
    }

    return this.usersService.uploadAvatar(id, file);
  }
}
