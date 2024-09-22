import { Invite } from "./entities/invite.entity";

export interface InviteReplyStrategy {
  execute(invite: Invite): Promise<void>;
}
