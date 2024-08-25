import { User } from "src/users/entities/user.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  BeforeInsert,
  OneToMany,
} from "typeorm";
import { UserTeam } from "./user-team-relation.entity";

@Entity({ name: "teams" })
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  logo: string;

  @Column({ name: "max_members", default: 3 })
  maxMembers: number;

  @ManyToMany(() => User, (user) => user.teams)
  users: User[];

  @OneToMany(() => UserTeam, (userTeam) => userTeam.team)
  userTeams: UserTeam[];

  constructor(partial: Partial<Team>) {
    Object.assign(this, partial);
  }

  @BeforeInsert()
  addDefaultLogo() {
    if (!this.logo) {
      this.logo = `https://api.dicebear.com/9.x/initials/svg?seed=${this.name}`;
    }
  }
}
