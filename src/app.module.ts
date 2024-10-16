// app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { EmailModule } from "./email/email.module";
import { UploaderModule } from "./uploader/uploader.module";
import { TeamsModule } from "./teams/teams.module";
import { InvitesModule } from "./invites/invites.module";
import { GatewayModule } from "./gateway/gateway.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { BoardsModule } from "./boards/boards.module";
import { ShapesModule } from "./shapes/shapes.module";
import { PathsModule } from "./paths/paths.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    EmailModule,
    UploaderModule,
    TeamsModule,
    InvitesModule,
    GatewayModule,
    GatewayModule,
    NotificationsModule,
    BoardsModule,
    ShapesModule,
    PathsModule
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
