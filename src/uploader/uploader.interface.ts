import { ConfigAndUrlOptions, TransformationOptions } from "cloudinary";

export interface UploaderService {
  /**
   * Upload the provided file to a third-party CDN and returns
   * the id of the file in the CDN context.
   * @param {Express.Multer.File} file
   * @param {string} folder
   * @param {string} public_id
   */
  uploadFile(file: Express.Multer.File, folder?: string, public_id?: string): Promise<string>;
  deleteFile(publicId: string): Promise<void>;
  getFileUrl(publicId: string, options?: TransformationOptions | ConfigAndUrlOptions): string;
}

export const UploaderService = Symbol("UploaderService");
