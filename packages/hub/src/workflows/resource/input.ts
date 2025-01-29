import { CatalogId, ResourceId, ResourceParams, ResourceTypeId } from "@stamp-lib/stamp-types/models";
import { GroupId, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { z } from "zod";

export const GetResourceInfoInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  requestUserId: UserId,
});
export type GetResourceInfoInput = z.infer<typeof GetResourceInfoInput>;

export const CreateResourceInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  inputParams: ResourceParams,
  parentResourceId: ResourceId.optional(),
  approverGroupId: GroupId.optional(),
  ownerGroupId: GroupId.optional(),
  requestUserId: UserId,
});
export type CreateResourceInput = z.infer<typeof CreateResourceInput>;

export const DeleteResourceInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  requestUserId: UserId,
});
export type DeleteResourceInput = z.infer<typeof DeleteResourceInput>;

export const ListResourceOutlinesInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  parentResourceId: z.string().optional(), // If specified, returns list that is a child of this parent resource.
  prefix: z.object({ type: z.enum(["name"]), value: z.string() }).optional(), // If specified, returns list that satisfies this prefix condition.
  paginationToken: z.string().optional(), // If specified, returns list using pagination token.
  requestUserId: UserId,
});
export type ListResourceOutlinesInput = z.infer<typeof ListResourceOutlinesInput>;

export const UpdateResourceApproverInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  approverGroupId: GroupId,
  requestUserId: UserId,
});
export type UpdateResourceApproverInput = z.infer<typeof UpdateResourceApproverInput>;

export const UpdateResourceOwnerInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  ownerGroupId: GroupId,
  requestUserId: UserId,
});
export type UpdateResourceOwnerInput = z.infer<typeof UpdateResourceOwnerInput>;

export const ListResourceAuditItemInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  requestUserId: UserId,
  paginationToken: z.string().optional(), // If specified, returns list using pagination token.
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListResourceAuditItemInput = z.infer<typeof ListResourceAuditItemInput>;

export const CreateAuditNotificationInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  requestUserId: UserId,
  notificationParam: z.object({
    typeId: z.string(),
    channelProperties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    cronExpression: z.string(), //TODO: validate cron expression
  }),
});
export type CreateAuditNotificationInput = z.infer<typeof CreateAuditNotificationInput>;

export const UpdateAuditNotificationInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  requestUserId: UserId,
  auditNotificationId: z.string(),
  notificationParam: z.object({
    typeId: z.string(),
    channelProperties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    cronExpression: z.string(),
  }),
});
export type UpdateAuditNotificationInput = z.infer<typeof UpdateAuditNotificationInput>;

export const DeleteAuditNotificationInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  requestUserId: UserId,
  auditNotificationId: z.string(),
});
export type DeleteAuditNotificationInput = z.infer<typeof DeleteAuditNotificationInput>;
