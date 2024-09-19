import { Plan } from "./enums/plan.enum";

export function getPlanDetails(plan: Plan): { maxOwnedTeams: number; maxMembersPerTeam: number } {
  switch (plan) {
    case "FREE":
      return {
        maxOwnedTeams: 1,
        maxMembersPerTeam: 3,
      };
    case "STANDARD":
      return {
        maxOwnedTeams: 5,
        maxMembersPerTeam: 10,
      };
    case "PREMIUM":
      return {
        maxOwnedTeams: 15,
        maxMembersPerTeam: 25,
      };
    default:
      throw new Error("Invalid plan");
  }
}
