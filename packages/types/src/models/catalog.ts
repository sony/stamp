import { z } from "zod";
import { ApprovalFlowConfig } from "./approvalFlow";
import { ResourceTypeConfig } from "./resourceType";
import { CatalogId } from "./id";

export const CatalogInfoOnDB = z.object({ id: z.string().max(128), ownerGroupId: z.string().optional() });
export type CatalogInfoOnDB = z.infer<typeof CatalogInfoOnDB>;

export const CatalogUpdateInput = CatalogInfoOnDB;
export type CatalogUpdateInput = z.infer<typeof CatalogUpdateInput>;

export const CatalogInfoOnConfig = z.object({
  id: CatalogId,
  name: z.string().max(128),
  description: z.string().max(256),
  approvalFlowIds: z.array(z.string()).max(12),
  resourceTypeIds: z.array(z.string()).max(12),
});
export type CatalogInfoOnConfig = z.infer<typeof CatalogInfoOnConfig>;

/**
 * CatalogInfo is a type that is referenced by the FrontEnd.
 */
export const CatalogInfo = CatalogInfoOnConfig.merge(CatalogInfoOnDB);
export type CatalogInfo = z.infer<typeof CatalogInfo>;

/**
 * CatalogConfig is the type for Stamp Catalog configuration params.
 */
export const CatalogConfig = z.object({
  id: CatalogId,
  name: z.string().max(128),
  description: z.string().max(256),
  approvalFlows: z.array(ApprovalFlowConfig).max(12),
  resourceTypes: z.array(ResourceTypeConfig).max(12),
});
export type CatalogConfig = z.infer<typeof CatalogConfig>;
