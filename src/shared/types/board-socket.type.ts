import { Permission } from "../enums/permission.enum";
import { Plan } from "../enums/plan.enum";

export type LoggedInUser = {
    id: number;
    username: string;
    email: string;
    emailVerified: boolean;
    avatar: string;
    createdAt: string;
    accountPlan: Plan;
    permission?: Permission;
};

export type UserJoinedPayload = {
    socketId: string;
    user: LoggedInUser;
}

