import { Path } from "src/paths/entities/path.entity";
import { Shape } from "src/shapes/entities/shape.entity";
import { Team } from "src/teams/entities/team.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "boards" })
export class Board {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToOne(() => Team, (team) => team.boards)
    team: Team

    @OneToMany(() => Shape, (shape) => shape.board)
    shapes: Shape[]

    @OneToMany(() => Path, (path) => path.board)
    paths: Path[]

    constructor(partial: Partial<Board>) {
        Object.assign(this, partial)
    }
}