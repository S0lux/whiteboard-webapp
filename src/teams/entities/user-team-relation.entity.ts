import { User } from "src/users/entities/user.entity";
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Team } from "./team.entity";

@Entity("user_teams")
export class UserTeam {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.userTeams)
  user: User;

  @ManyToOne(() => Team, (team) => team.userTeams)
  team: Team;

  @Column()
  role: string;
}
