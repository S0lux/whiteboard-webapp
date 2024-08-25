import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("user_teams")
export class UserTeam {
  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  team_id: number;

  @Column()
  role: string;
}
