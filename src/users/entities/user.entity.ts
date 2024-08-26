import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import * as argon2 from "argon2";
import { Team } from "src/teams/entities/team.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Invite } from "src/invites/entities/invite.entity";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "username", nullable: false, unique: true })
  username: string;

  @Column({ name: "email", nullable: false, unique: true })
  email: string;

  @Column({ name: "email_verified", nullable: false, default: false })
  emailVerified: boolean;

  @Column({ name: "hashed_password", nullable: false })
  hashedPassword: string;

  @Column({ name: "avatar", nullable: false })
  avatar: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt: Date;

  @Column({ name: "max_owned_teams", default: 1 })
  maxOwnedTeams: number;

  @ManyToMany(() => Team, (team) => team.users)
  teams: Team[];

  @OneToMany(() => UserTeam, (userTeam) => userTeam.user)
  userTeams: UserTeam[];

  @OneToMany(() => Invite, (invite) => invite.sender)
  sentInvites: Invite[];

  @OneToMany(() => Invite, (invite) => invite.recipient)
  receivedInvites: Invite[];

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }

  password: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const hash = await argon2.hash(this.password);
      this.hashedPassword = hash;
    }
  }

  @BeforeInsert()
  async generateUserAvatar() {
    if (!this.avatar) {
      this.avatar = `https://api.dicebear.com/9.x/big-ears-neutral/svg?seed=${this.username}`;
    }
  }
}
