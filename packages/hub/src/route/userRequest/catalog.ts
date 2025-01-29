import { router, publicProcedure } from "../../trpc";
import { CatalogUpdateInput } from "@stamp-lib/stamp-types/models";
import { z } from "zod";

import { unwrapOrthrowTRPCError, unwrapOptionOrThrowNotFound } from "../../utils/neverthrow";
import { convertTRPCError } from "../../error";
import { isAdmin } from "../../events/admin/isAdmin";
import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { TRPCError } from "@trpc/server";
import { getCatalogInfo } from "../../workflows/catalog/get";
import { listCatalogInfo } from "../../workflows/catalog/list";
import { createStampHubLogger } from "../../logger";

export const catalogRouter = router({
  get: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const getCatalogInfoResult = await getCatalogInfo(ctx.db.catalogDB["getById"], ctx.config.catalogInfo["get"])(input)
      .andThen(unwrapOptionOrThrowNotFound)
      .mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(getCatalogInfoResult);
  }),
  list: publicProcedure.query(async ({ ctx }) => {
    const logger = createStampHubLogger();
    const listCatalogInfoResult = await listCatalogInfo(ctx.db.catalogDB["listAll"], ctx.config.catalogInfo["list"])().mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(listCatalogInfoResult);
  }),
  update: publicProcedure.input(CatalogUpdateInput.extend({ requestUserId: UserId })).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const isAdminResult = unwrapOrthrowTRPCError(await isAdmin(ctx.identity.user.get)({ userId: input.requestUserId }).mapErr(convertTRPCError(logger)));
    if (!isAdminResult) {
      throw new TRPCError({ message: "Permission denied", code: "FORBIDDEN" });
    }
    // TODO: Validate the groupId present in the input
    const setCatalogInfoOnConfigResult = await ctx.db.catalogDB.set(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(setCatalogInfoOnConfigResult);
  }),
});
