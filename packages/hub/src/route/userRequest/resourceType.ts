import { router, publicProcedure } from "../../trpc";
import { getResourceTypeInfo } from "../../workflows/resource-type/getResourceTypeInfo";
import { listResourceTypeInfo } from "../../workflows/resource-type/listResourceTypeInfo";
import { convertTRPCError } from "../../error";
import { unwrapOrthrowTRPCError } from "../../utils/neverthrow";
import { GetResourceTypeInfoInput, ListResourceTypeInfoInput } from "../../workflows/resource-type/input";
import { createStampHubLogger } from "../../logger";

export const resourceTypeRouter = router({
  get: publicProcedure.input(GetResourceTypeInfoInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const getResourceTypeInfoResult = await getResourceTypeInfo(input, ctx.config.catalogConfig).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(getResourceTypeInfoResult);
  }),
  list: publicProcedure.input(ListResourceTypeInfoInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const listResourceTypeInfoResult = await listResourceTypeInfo(input, ctx.config.catalogConfig).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(listResourceTypeInfoResult);
  }),
});
