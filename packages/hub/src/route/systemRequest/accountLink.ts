import { router, publicProcedure } from "../../trpc";
import { unwrapOrthrowTRPCError, unwrapOptionOrThrowNotFound } from "../../utils/neverthrow";
import { convertTRPCError } from "../../error";
import { createStampHubLogger } from "../../logger";

import {
  GetAccountLinkInput,
  ListAccountLinkByUserIdInput,
  CreateAccountLinkInput,
  DeleteAccountLinkInput,
} from "@stamp-lib/stamp-types/pluginInterface/identity";

export const accountLinkRouter = router({
  get: publicProcedure.input(GetAccountLinkInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const accountLinkResult = await ctx.identity.accountLink.get(input).andThen(unwrapOptionOrThrowNotFound).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(accountLinkResult);
  }),
  listByUserId: publicProcedure.input(ListAccountLinkByUserIdInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const listAccountLinkResult = await ctx.identity.accountLink.listByUserId(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(listAccountLinkResult);
  }),
  set: publicProcedure.input(CreateAccountLinkInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const createAccountLinkResult = await ctx.identity.accountLink.set(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(createAccountLinkResult);
  }),
  delete: publicProcedure.input(DeleteAccountLinkInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const deleteAccountLinkResult = await ctx.identity.accountLink.delete(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(deleteAccountLinkResult);
  }),
});
