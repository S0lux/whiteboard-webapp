import { Path } from "src/paths/entities/path.entity";
import { Shape } from "src/shapes/entities/shape.entity";
import { Team } from "src/teams/entities/team.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { UserBoard } from "./user_board.entity";
import { LoggedInUser, Presentation, StageConfig } from "src/shared/types/board-socket.type";
import { PresentationState } from "src/gateway/board.gateway";

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
    presentation: {
        presenter: LoggedInUser | null;
        presentation: StageConfig | null;
        participants: { socketId: string; user: LoggedInUser }[];
    } | null;

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

    setPresentationState(state: PresentationState) {
        if (state) {
            this.presentation = {
                presenter: state.presenter,
                presentation: state.presentation,
                participants: Array.from(state.participants.entries()).map(([socketId, user]) => ({
                    socketId,
                    user
                }))
            };
        } else {
            this.presentation = null;
        }
    }
}