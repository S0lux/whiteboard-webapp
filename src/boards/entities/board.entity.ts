import { Path } from "src/paths/entities/path.entity";
import { Shape } from "src/shapes/entities/shape.entity";
import { Team } from "src/teams/entities/team.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { UserBoard } from "./user_board.entity";
import { Presentation } from "src/shared/types/board-socket.type";

@Entity({ name: "boards" })
export class Board {
    @PrimaryGeneratedColumn()
    id: number;

    @Unique(["name"])
    @Column()
    name: string;


    @Column({
        type: "jsonb",
        nullable: true
    })
    presentation: Presentation | null = null;

    @ManyToOne(() => Team, (team) => team.boards)
    team: Team

    @OneToMany(() => Shape, (shape) => shape.board)
    shapes: Shape[]

    @OneToMany(() => Path, (path) => path.board)
    paths: Path[]

    @OneToMany(() => UserBoard, (userBoard) => userBoard.board)
    userBoards: UserBoard[];

    constructor(partial: Partial<Board>) {
        Object.assign(this, partial)
    }
}