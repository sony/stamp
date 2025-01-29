import { z } from "zod";
import { ResultAsync } from "neverthrow";
import { IdentityPluginError } from "./error";
import { Option } from "@stamp-lib/stamp-option";

export const AccountLinkSession = z.object({
  sessionKey: z.string().max(256),
  userId: z.string().uuid(),
  accountProviderName: z.string().max(256),
  createdAt: z.string().datetime(),
});
export type AccountLinkSession = z.infer<typeof AccountLinkSession>;

export const StartAccountLinkSessionInput = z.object({
  userId: z.string().uuid(),
  accountProviderName: z.string().max(256),
});

export type StartAccountLinkSessionInput = z.infer<typeof StartAccountLinkSessionInput>;
export type StartAccountLinkSessionOutput = ResultAsync<AccountLinkSession, IdentityPluginError>;
export type StartAccountLinkSession = (input: StartAccountLinkSessionInput) => StartAccountLinkSessionOutput;

export const GetAccountLinkSessionInput = z.object({
  sessionKey: z.string().max(256),
});
export type GetAccountLinkSessionInput = z.infer<typeof GetAccountLinkSessionInput>;
export type GetAccountLinkSessionOutput = ResultAsync<Option<AccountLinkSession>, IdentityPluginError>;
export type GetAccountLinkSession = (input: GetAccountLinkSessionInput) => GetAccountLinkSessionOutput;

export const DeleteAccountLinkSessionInput = z.object({
  sessionKey: z.string().max(256),
});
export type DeleteAccountLinkSessionInput = z.infer<typeof DeleteAccountLinkSessionInput>;
export type DeleteAccountLinkSessionOutput = ResultAsync<void, IdentityPluginError>;
export type DeleteAccountLinkSession = (input: DeleteAccountLinkSessionInput) => DeleteAccountLinkSessionOutput;

export type AccountLinkSessionProvider = {
  start: StartAccountLinkSession;
  get: GetAccountLinkSession;
  delete: DeleteAccountLinkSession;
};
