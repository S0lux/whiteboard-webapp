import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Path } from "./entities/path.entity";
import { PathsService } from "./paths.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([Path]),
    ],
    providers: [PathsService],
})
export class PathsModule { }
