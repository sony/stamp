export * from "./accountLink";
export * from "./accountLinkSession";
export * from "./error";
export * from "./group";
export * from "./groupMemberShip";
export * from "./user";

import { AccountLinkProvider } from "./accountLink";
import { AccountLinkSessionProvider } from "./accountLinkSession";
import { GroupProvider } from "./group";
import { GroupMemberShipProvider } from "./groupMemberShip";
import { UserProvider } from "./user";

export type IdentityProvider = {
  accountLink: AccountLinkProvider;
  accountLinkSession: AccountLinkSessionProvider;
  group: GroupProvider;
  groupMemberShip: GroupMemberShipProvider;
  user: UserProvider;
};
