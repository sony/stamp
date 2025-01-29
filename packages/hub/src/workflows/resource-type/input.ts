import { ResourceTypeId, CatalogId } from "@stamp-lib/stamp-types/models";
import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { z } from "zod";

export const GetResourceTypeInfoInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  requestUserId: UserId,
});
export type GetResourceTypeInfoInput = z.infer<typeof GetResourceTypeInfoInput>;

export const ListResourceTypeInfoInput = z.object({
  catalogId: CatalogId,
  requestUserId: UserId,
});
export type ListResourceTypeInfoInput = z.infer<typeof ListResourceTypeInfoInput>;
