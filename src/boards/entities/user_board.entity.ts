import { Path } from "src/paths/entities/path.entity";
import { Shape } from "src/shapes/entities/shape.entity";
import { Team } from "src/teams/entities/team.entity";
import { User } from "src/users/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Board } from "./board.entity";

@Entity({ name: "user_boards" })
export class UserBoard {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.userTeams)
    user: User;

    @ManyToOne(() => Board, (board) => board.userBoards)
    board: Board;

    @Column({ type: "jsonb" })
    data = {
        stageScale: 1,
        stageX: 0,
        stageY: 0,
    };

    constructor(partial: Partial<UserBoard>) {
        Object.assign(this, partial)
    }
}