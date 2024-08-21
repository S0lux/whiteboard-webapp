import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import crypto from "crypto";

@Entity({ name: "email_tokens" })
export class EmailToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "token", nullable: false, unique: true })
  token: string;

  @Column({ name: "user_id", nullable: false })
  userId: number;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: "user_id" })
  user: User;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt: Date;

  @Column({ name: "expires_at", type: "timestamp", nullable: false })
  expiresAt: Date;

  constructor(partial: Partial<EmailToken>) {
    Object.assign(this, partial);
  }

  @BeforeInsert()
  generateToken() {
    this.token = crypto.randomBytes(32).toString("hex");
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token expires in 24 hours
  }
}
