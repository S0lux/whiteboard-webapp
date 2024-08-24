import { ConfigAndUrlOptions, TransformationOptions } from "cloudinary";

export interface UploaderService {
  uploadFile(file: Express.Multer.File, folder?: string, public_id?: string): Promise<string>;
  deleteFile(publicId: string): Promise<void>;
  getFileUrl(
    publicId: string,
    options?: TransformationOptions | ConfigAndUrlOptions,
  ): Promise<string>;
}

export const UploaderService = Symbol("UploaderService");
