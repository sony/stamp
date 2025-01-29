import { AccountLinkProvider, IdentityPluginError, AccountLink } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, okAsync } from "neverthrow";
import { some, none, Option } from "@stamp-lib/stamp-option";

export type AccountLinkOnMemory = {
  userId: string;
  createdAt: string;
};

// First map key is accountProviderName. Second map key is accountId
const accountProviderMap = new Map<string, Map<string, AccountLinkOnMemory>>();
export const accountLinkProvider: AccountLinkProvider = {
  get: function (input): ResultAsync<Option<AccountLink>, IdentityPluginError> {
    const accountLink = accountProviderMap.get(input.accountProviderName)?.get(input.accountId);
    if (!accountLink) {
      return okAsync(none);
    } else {
      return okAsync(
        some({
          accountProviderName: input.accountProviderName,
          accountId: input.accountId,
          userId: accountLink.userId,
          createdAt: accountLink.createdAt,
        })
      );
    }
  },

  listByUserId: function (input): ResultAsync<AccountLink[], IdentityPluginError> {
    const accountLinks = [];
    for (const [accountProviderName, accountIdMap] of accountProviderMap.entries()) {
      for (const [accountId, accountLinkOnMemory] of accountIdMap.entries()) {
        if (accountLinkOnMemory.userId === input.userId) {
          accountLinks.push({
            accountProviderName: accountProviderName,
            accountId: accountId,
            userId: input.userId,
            createdAt: accountLinkOnMemory.createdAt,
          });
        }
      }
    }
    return okAsync(accountLinks);
  },
  set: function (input): ResultAsync<AccountLink, IdentityPluginError> {
    const accountLinkOnMemory: AccountLinkOnMemory = {
      userId: input.userId,
      createdAt: new Date().toISOString(),
    };
    let accountIdMap = accountProviderMap.get(input.accountProviderName);
    if (!accountIdMap) {
      accountIdMap = new Map<string, AccountLinkOnMemory>();
      accountProviderMap.set(input.accountProviderName, accountIdMap);
    }
    accountIdMap.set(input.accountId, accountLinkOnMemory);
    return okAsync({
      accountProviderName: input.accountProviderName,
      accountId: input.accountId,
      userId: input.userId,
      createdAt: accountLinkOnMemory.createdAt,
    });
  },
  delete: function (input): ResultAsync<void, IdentityPluginError> {
    const accountIdMap = accountProviderMap.get(input.accountProviderName);
    if (!accountIdMap) {
      return okAsync(undefined);
    }
    accountIdMap.delete(input.accountId);
    return okAsync(undefined);
  },
  deleteAllByUserId: function (input): ResultAsync<void, IdentityPluginError> {
    for (const accountIdMap of accountProviderMap.values()) {
      for (const [accountId, accountLinkOnMemory] of accountIdMap.entries()) {
        if (accountLinkOnMemory.userId === input.userId) {
          accountIdMap.delete(accountId);
        }
      }
    }
    return okAsync(undefined);
  },
};
