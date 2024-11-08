import { User } from "src/users/entities/user.entity";
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Team } from "./team.entity";
import { Role } from "src/shared/enums/role.enum";
import { Permission } from "src/shared/enums/permission.enum";

@Entity("user_teams")
export class UserTeam {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.userTeams)
  user: User;

  @ManyToOne(() => Team, (team) => team.userTeams)
  team: Team;

  @Column()
  role: Role;

  @Column()
  permission: Permission = Permission.VIEW;
}
