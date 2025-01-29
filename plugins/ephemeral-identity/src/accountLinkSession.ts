import { AccountLinkSessionProvider, IdentityPluginError, AccountLinkSession } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, okAsync } from "neverthrow";
import { some, none, Option } from "@stamp-lib/stamp-option";

const AccountLinkSessionMap = new Map<string, AccountLinkSession>();

export const accountLinkSessionProvider: AccountLinkSessionProvider = {
  start: function (input): ResultAsync<AccountLinkSession, IdentityPluginError> {
    const sessionKey = globalThis.crypto.randomUUID();
    const accountLinkSession: AccountLinkSession = {
      sessionKey: sessionKey,
      userId: input.userId,
      accountProviderName: input.accountProviderName,
      createdAt: new Date().toISOString(),
    };
    AccountLinkSessionMap.set(sessionKey, accountLinkSession);
    return okAsync(accountLinkSession);
  },
  get: function (input): ResultAsync<Option<AccountLinkSession>, IdentityPluginError> {
    const accountLinkSession = AccountLinkSessionMap.get(input.sessionKey);
    if (!accountLinkSession) {
      return okAsync(none);
    } else {
      return okAsync(some(accountLinkSession));
    }
  },
  delete: function (input): ResultAsync<void, IdentityPluginError> {
    AccountLinkSessionMap.delete(input.sessionKey);
    return okAsync(undefined);
  },
};
