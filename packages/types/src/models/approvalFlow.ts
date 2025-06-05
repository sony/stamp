import { z } from "zod";
import { ApprovalFlowHandler } from "../catalogInterface/handler/approvalFlow";
import { ApprovalFlowId, CatalogId } from "./id";
import { ResourceTypeId } from "./resourceType";
export const ApprovalFlowInputParam = z.object({
  id: z.string().max(128),
  name: z.string().max(128),
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean(),
  description: z.string().max(256).optional(),
});
export type ApprovalFlowInputParam = z.infer<typeof ApprovalFlowInputParam>;

// Setting who to assign as approvers for the ApprovalFlow
// It is possible to choose whether to use the approverGroupIds set in ApprovalFlow or the approverGroupIds set for the specified resourceType
const Approver = z.discriminatedUnion("approverType", [
  z.object({ approverType: z.literal("approvalFlow") }),
  z.object({ approverType: z.literal("resource"), resourceTypeId: ResourceTypeId }),
  z.object({ approverType: z.literal("requestSpecified") }), // Approver is specified by the request
]);

export const InputResource = z.object({
  resourceTypeId: z.string().max(128),
  parentResourceTypeId: z.string().max(128).optional(),
  description: z.string().max(256).optional(),
});
export type InputResource = z.infer<typeof InputResource>;

export const AutoRevoke = z.object({
  enabled: z.boolean().default(false),
  defaultSettings: z.object({
    required: z.boolean().default(false),
    maxDuration: z.optional(z.string().regex(/^P(?:(?:\d+D(?:T\d+H)?)|(?:T\d+H))$/, "Invalid ISO 8601 duration format. Expected format: PnDTnH")),
  }),
  // Field for allowing overriding settings on target resources in the future
  // overrideSettingsResourceTypeId: z.string().max(128).optional(),
});
export type AutoRevoke = z.infer<typeof AutoRevoke>;

export const ApprovalFlowConfig = z.object({
  id: ApprovalFlowId,
  name: z.string().max(128),
  description: z.string().max(256),
  inputParams: z.array(ApprovalFlowInputParam).max(5),
  handlers: z.any().transform((v) => v as ApprovalFlowHandler),
  inputResources: z.array(InputResource).optional(),
  approver: Approver,
  enableRevoke: z.boolean().optional(),
  autoRevoke: AutoRevoke.optional(),
});
export type ApprovalFlowConfig = z.infer<typeof ApprovalFlowConfig>;

export const ApprovalFlowInfoOnDB = z.object({
  id: ApprovalFlowId,
  catalogId: CatalogId,
  approverGroupId: z.string().optional(),
});
export type ApprovalFlowInfoOnDB = z.infer<typeof ApprovalFlowInfoOnDB>;

export const ApprovalFlowInfoOnConfig = ApprovalFlowConfig.omit({ handlers: true }).merge(z.object({ catalogId: CatalogId }));
export type ApprovalFlowInfoOnConfig = z.infer<typeof ApprovalFlowInfoOnConfig>;

export const ApprovalFlowInfo = ApprovalFlowInfoOnConfig.merge(ApprovalFlowInfoOnDB);
export type ApprovalFlowInfo = z.infer<typeof ApprovalFlowInfo>;
