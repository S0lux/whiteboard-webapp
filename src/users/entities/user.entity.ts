import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

const argon2 = require("argon2");

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

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt: Date;

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
}
