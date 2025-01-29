import { IdentityProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";

import { accountLinkProvider } from "./accountLink";
import { accountLinkSessionProvider } from "./accountLinkSession";
import { groupProvider } from "./group";
import { groupMemberShipProvider } from "./groupMemberShip";
import { userProvider, adminUserProvider } from "./user";

export const ephemeralIdentityPlugin: IdentityProvider = {
  accountLink: accountLinkProvider,
  accountLinkSession: accountLinkSessionProvider,
  group: groupProvider,
  groupMemberShip: groupMemberShipProvider,
  user: userProvider,
};

export const ephemeralIdentityPluginForAllUserAdmin: IdentityProvider = {
  accountLink: accountLinkProvider,
  accountLinkSession: accountLinkSessionProvider,
  group: groupProvider,
  groupMemberShip: groupMemberShipProvider,
  user: adminUserProvider,
};
