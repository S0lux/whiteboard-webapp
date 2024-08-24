import { Module } from "@nestjs/common";
import { CloudinaryUploaderService } from "./cloudinary-uploader/cloudinary-uploader.service";
import { UploaderService } from "./uploader.interface";

@Module({
  providers: [
    {
      provide: UploaderService,
      useClass: CloudinaryUploaderService,
    },
  ],
  exports: [UploaderService],
})
export class UploaderModule {}
