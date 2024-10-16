import { Board } from "src/boards/entities/board.entity";
import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

@Entity({ name: "shapes" })
export class Shape {
    @PrimaryColumn()
    id: string;

    @Column({
        type: "jsonb"
    })
    data = {};

    @Column()
    blocking: boolean = false;

    @ManyToOne(() => Board, (board) => board.shapes)
    board: Board
}

