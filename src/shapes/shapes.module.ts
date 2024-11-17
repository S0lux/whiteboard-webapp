import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Shape } from "./entities/shape.entity";
import { ShapesService } from "./shapes.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([Shape]),
    ],
    providers: [ShapesService],
})
export class ShapesModule { }
