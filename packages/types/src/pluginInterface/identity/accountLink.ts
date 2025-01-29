import { z } from "zod";
import { ResultAsync } from "neverthrow";
import { IdentityPluginError } from "./error";
import { Option } from "@stamp-lib/stamp-option";

export const AccountLink = z.object({
  accountProviderName: z.string().max(256),
  accountId: z.string().max(256),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type AccountLink = z.infer<typeof AccountLink>;

export const GetAccountLinkInput = z.object({
  accountProviderName: z.string().max(256),
  accountId: z.string().max(256),
});
export type GetAccountLinkInput = z.infer<typeof GetAccountLinkInput>;
export type GetAccountLinkOutput = ResultAsync<Option<AccountLink>, IdentityPluginError>;
export type GetAccountLink = (input: GetAccountLinkInput) => GetAccountLinkOutput;

export const ListAccountLinkByUserIdInput = z.object({
  userId: z.string().uuid(),
});
export type ListAccountLinkByUserIdInput = z.infer<typeof ListAccountLinkByUserIdInput>;
export type ListAccountLinkByUserIdOutput = ResultAsync<Array<AccountLink>, IdentityPluginError>;
export type ListAccountLinkByUserId = (input: ListAccountLinkByUserIdInput) => ListAccountLinkByUserIdOutput;

export const CreateAccountLinkInput = z.object({
  accountProviderName: z.string().max(256),
  accountId: z.string().max(256),
  userId: z.string().uuid(),
});
export type SetAccountLinkInput = z.infer<typeof CreateAccountLinkInput>;
export type SetAccountLinkOutput = ResultAsync<AccountLink, IdentityPluginError>;
export type SetAccountLink = (input: SetAccountLinkInput) => SetAccountLinkOutput;

export const DeleteAccountLinkInput = z.object({
  accountProviderName: z.string().max(256),
  accountId: z.string().max(256),
});
export type DeleteAccountLinkInput = z.infer<typeof DeleteAccountLinkInput>;
export type DeleteAccountLinkOutput = ResultAsync<void, IdentityPluginError>;
export type DeleteAccountLink = (input: DeleteAccountLinkInput) => DeleteAccountLinkOutput;

export const DeleteAllAccountLinkByUserIdInput = z.object({
  userId: z.string().uuid(),
});
export type DeleteAllAccountLinkByUserIdInput = z.infer<typeof DeleteAllAccountLinkByUserIdInput>;
export type DeleteAllAccountLinkByUserIdOutput = ResultAsync<void, IdentityPluginError>;
export type DeleteAllAccountLinkByUserId = (input: DeleteAllAccountLinkByUserIdInput) => DeleteAllAccountLinkByUserIdOutput;

export type AccountLinkProvider = {
  get: GetAccountLink;
  listByUserId: ListAccountLinkByUserId;
  set: SetAccountLink;
  delete: DeleteAccountLink;
  deleteAllByUserId: DeleteAllAccountLinkByUserId;
};
