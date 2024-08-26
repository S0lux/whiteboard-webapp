import { PipeTransform, ArgumentMetadata, BadRequestException } from "@nestjs/common";
import { ZodSchema, ZodError } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => {
          return {
            field: err.path.join("."),
            message: err.message,
          };
        });
        throw new BadRequestException({
          message: "Validation failed",
          errors: errorMessages,
        });
      }
      throw new BadRequestException("Validation failed");
    }
  }
}
