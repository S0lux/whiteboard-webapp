import { Board } from "src/boards/entities/board.entity";
import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

@Entity({ name: "paths" })
export class Path {
    @PrimaryColumn()
    id: string;

    @Column({
        type: "jsonb"
    })
    data = {}

    @Column()
    blocking: boolean = false;

    @ManyToOne(() => Board, (board) => board.paths)
    board: Board
}

