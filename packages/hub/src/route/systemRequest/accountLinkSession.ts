import { router, publicProcedure } from "../../trpc";
import { unwrapOrthrowTRPCError, unwrapOptionOrThrowNotFound } from "../../utils/neverthrow";
import { convertTRPCError } from "../../error";

import { StartAccountLinkSessionInput, GetAccountLinkSessionInput, DeleteAccountLinkSessionInput } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { createStampHubLogger } from "../../logger";

export const accountLinkSessionRouter = router({
  start: publicProcedure.input(StartAccountLinkSessionInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const startAccountLinkSessionResult = await ctx.identity.accountLinkSession.start(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(startAccountLinkSessionResult);
  }),
  get: publicProcedure.input(GetAccountLinkSessionInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const getAccountLinkSessionResult = await ctx.identity.accountLinkSession.get(input).andThen(unwrapOptionOrThrowNotFound).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(getAccountLinkSessionResult);
  }),
  delete: publicProcedure.input(DeleteAccountLinkSessionInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const deleteAccountLinkSessionResult = await ctx.identity.accountLinkSession.delete(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(deleteAccountLinkSessionResult);
  }),
});
