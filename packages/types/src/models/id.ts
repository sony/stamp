import { z } from "zod";

export const ApprovalFlowId = z.string().min(1).max(128);
export type ApprovalFlowId = z.infer<typeof ApprovalFlowId>;

export const CatalogId = z.string().min(1).max(128);
export type CatalogId = z.infer<typeof CatalogId>;
