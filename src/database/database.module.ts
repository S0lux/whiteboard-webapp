// database.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { join } from "path";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        port: 5432,
        host: configService.getOrThrow<string>("POSTGRES_HOST"),
        username: configService.getOrThrow<string>("POSTGRES_USER"),
        password: configService.getOrThrow<string>("POSTGRES_PASSWORD"),
        database: configService.getOrThrow<string>("POSTGRES_DB"),
        synchronize: configService.getOrThrow<boolean>("TYPEORM_SYNCHRONIZE", false),
        entities: [join(__dirname, "..", "**", "*.entity.{ts,js}")],
      }),
    }),
  ],
})
export class DatabaseModule {}
