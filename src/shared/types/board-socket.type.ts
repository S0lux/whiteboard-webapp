import { Plan } from "../enums/plan.enum";

export type LoggedInUser = {
    id: number;
    username: string;
    email: string;
    emailVerified: boolean;
    avatar: string;
    createdAt: string;
    accountPlan: Plan;
};

export type UserJoinedPayload = {
    socketId: string;
    user: LoggedInUser;
}

