import { Injectable } from "@nestjs/common";
import { UploaderService } from "../uploader.interface";
import { v2 as cloudinary, ConfigAndUrlOptions, TransformationOptions } from "cloudinary";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CloudinaryUploaderService implements UploaderService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow("CLOUDINARY_CLOUD_NAME"),
      api_key: this.configService.getOrThrow("CLOUDINARY_API_KEY"),
      api_secret: this.configService.getOrThrow("CLOUDINARY_API_SECRET"),
    });
  }

  async uploadFile(file: Express.Multer.File, folder?: string): Promise<string> {
    const result = await cloudinary.uploader.upload(file.path, { folder });
    return result.public_id;
  }

  async deleteFile(publicId: string): Promise<void> {
    return await cloudinary.uploader.destroy(publicId);
  }

  async getFileUrl(
    publicId: string,
    options?: TransformationOptions | ConfigAndUrlOptions,
  ): Promise<string> {
    return cloudinary.url(publicId, options);
  }
}
