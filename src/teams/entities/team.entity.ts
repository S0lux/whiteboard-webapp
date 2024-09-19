import { User } from "src/users/entities/user.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  BeforeInsert,
  OneToMany,
  AfterUpdate,
} from "typeorm";
import { UserTeam } from "./user-team-relation.entity";
import { Invite } from "../../invites/entities/invite.entity";
import { Exclude, Transform } from "class-transformer";

@Entity({ name: "teams" })
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  logoPublicId: string;

  @Column({ nullable: true })
  logo: string;

  @ManyToMany(() => User, (user) => user.teams)
  users: User[];

  @OneToMany(() => UserTeam, (userTeam) => userTeam.team)
  userTeams: UserTeam[];

  @OneToMany(() => Invite, (invite) => invite.team)
  invites: Invite[];

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
