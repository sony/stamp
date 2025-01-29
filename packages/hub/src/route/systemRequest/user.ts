import { router, publicProcedure } from "../../trpc";

import { unwrapOrthrowTRPCError, unwrapOptionOrThrowNotFound } from "../../utils/neverthrow";
import { convertTRPCError } from "../../error";

import { GetUserInput, ListUserInput, CreateUserInput, DeleteUserInput, UpdateUserInput } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { createStampHubLogger } from "../../logger";

export const userRouter = router({
  get: publicProcedure.input(GetUserInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const userResult = await ctx.identity.user.get(input).andThen(unwrapOptionOrThrowNotFound).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(userResult);
  }),
  list: publicProcedure.input(ListUserInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const listUserResult = await ctx.identity.user.list(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(listUserResult);
  }),
  create: publicProcedure.input(CreateUserInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const createUserResult = await ctx.identity.user.create(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(createUserResult);
  }),
  delete: publicProcedure.input(DeleteUserInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const deleteUserResult = await ctx.identity.user.delete(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(deleteUserResult);
  }),
  update: publicProcedure.input(UpdateUserInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const updateUserResult = await ctx.identity.user.update(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(updateUserResult);
  }),
});
