import { User } from "src/users/entities/user.entity";
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Team } from "./team.entity";
import { InviteStatus } from "src/shared/invite-status.enum";

@Entity({ name: "invites" })
export class Invite {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.sentInvites)
  sender: User;

  @ManyToOne(() => User, (user) => user.receivedInvites)
  recipient: User;

  @ManyToOne(() => Team, (team) => team.invites)
  team: Team;

  @Column({ default: InviteStatus.PENDING })
  status: InviteStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @BeforeInsert()
  setExpirationDate() {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);
    this.expiresAt = expirationDate;
  }
}
