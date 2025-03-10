import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import * as argon2 from "argon2";
import { Team } from "src/teams/entities/team.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Invite } from "src/invites/entities/invite.entity";
import { Notification } from "src/notifications/entities/notification.entity";
import { Plan } from "src/shared/enums/plan.enum";
import { UserBoard } from "src/boards/entities/user_board.entity";
import { Board } from "src/boards/entities/board.entity";

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

  @Column({ name: "account_plan", nullable: false, default: "FREE" })
  accountPlan: Plan;

  @ManyToMany(() => Team, (team) => team.users)
  teams: Team[];

  @OneToMany(() => UserTeam, (userTeam) => userTeam.user)
  userTeams: UserTeam[];

  @OneToMany(() => UserBoard, (userBoard) => userBoard.user)
  userBoards: UserBoard[];

  @OneToMany(() => Board, board => board.owner)
  ownedBoards: Board[];

  @OneToMany(() => Invite, (invite) => invite.sender)
  sentInvites: Invite[];

  @OneToMany(() => Invite, (invite) => invite.recipient)
  receivedInvites: Invite[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

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
