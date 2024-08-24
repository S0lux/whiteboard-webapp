import { Injectable } from "@nestjs/common";
import { UploaderService } from "../uploader.interface";
import { v2 as cloudinary, ConfigAndUrlOptions, TransformationOptions } from "cloudinary";
import { ConfigService } from "@nestjs/config";
import { Readable } from "stream";

@Injectable()
export class CloudinaryUploaderService implements UploaderService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow("CLOUDINARY_CLOUD_NAME"),
      api_key: this.configService.getOrThrow("CLOUDINARY_API_KEY"),
      api_secret: this.configService.getOrThrow("CLOUDINARY_API_SECRET"),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
    public_id?: string,
  ): Promise<string> {
    return new Promise((res, rej) => {
      const theTransformStream = cloudinary.uploader.upload_stream(
        { folder, public_id },
        (err, result) => {
          if (err) return rej(err);
          res(result!.public_id);
        },
      );
      let str = Readable.from(file.buffer);
      str.pipe(theTransformStream);
    });
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
