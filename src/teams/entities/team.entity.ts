import { User } from "src/users/entities/user.entity";
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, BeforeInsert } from "typeorm";

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

  @ManyToMany(() => User)
  users: User[];

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
