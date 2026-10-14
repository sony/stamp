import { z } from "zod";
import { CatalogId } from "./id";
import { ResourceTypeId } from "./resourceType";
import { GroupId, UserId } from "../pluginInterface/identity";
import { NotificationChannel } from "./notificationChannel";

export const ResourceParams = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]));
export type ResourceParams = z.infer<typeof ResourceParams>;

export const ResourceId = z.string().min(1).max(128);
export type ResourceId = z.infer<typeof ResourceId>;

export const ResourceName = z.string().max(256);
export type ResourceName = z.infer<typeof ResourceName>;

export const AuditNotification = z.object({
  id: z.string().uuid(),
  notificationChannel: NotificationChannel,
  schedulerEventId: z.string(),
  cronExpression: z.string(),
});

/**
 * If present, this resource has a pending update params request that must be approved before update is applied.
 */
export const PendingUpdateParams = z
  .object({
    approvalRequestId: z.string(),
    updateParams: ResourceParams,
    requestUserId: UserId,
    requestedAt: z.string(), // ISO date
  })
  .optional();
export type PendingUpdateParams = z.infer<typeof PendingUpdateParams>;

/**
 * Groups whose members are allowed to submit approval requests that include this resource.
 * `undefined` or an empty array means anyone can request.
 */
export const RequesterGroupIds = z.array(GroupId).max(10);
export type RequesterGroupIds = z.infer<typeof RequesterGroupIds>;

/**
 * Who can see this resource (listOutlines / get / listAuditItem).
 * - "all" (or `undefined`): everyone.
 * - "restricted": only members of ownerGroupId / approverGroupId / requesterGroupIds,
 *   the catalog owner group and the parent resource owner group.
 */
export const ResourceVisibility = z.enum(["all", "restricted"]);
export type ResourceVisibility = z.infer<typeof ResourceVisibility>;

export const ResourceInfo = z.object({
  id: ResourceId,
  name: ResourceName,
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  params: ResourceParams,
  approverGroupId: GroupId.optional(),
  ownerGroupId: GroupId.optional(),
  requesterGroupIds: RequesterGroupIds.optional(),
  visibility: ResourceVisibility.optional(),
  parentResourceId: ResourceId.optional(),
  parentResourceTypeId: ResourceTypeId.optional(),
  auditNotifications: z.array(AuditNotification).max(1).optional(),
  pendingUpdateParams: PendingUpdateParams,
});
export type ResourceInfo = z.infer<typeof ResourceInfo>;

export const ResourceOutline = z.object({
  id: ResourceId,
  name: ResourceName,
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  params: ResourceParams,
  parentResourceId: ResourceId.optional(),
});
export type ResourceOutline = z.infer<typeof ResourceOutline>;

export const ResourceOnDB = z.object({
  id: ResourceId,
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  approverGroupId: GroupId.optional(),
  ownerGroupId: GroupId.optional(),
  requesterGroupIds: RequesterGroupIds.optional(),
  visibility: ResourceVisibility.optional(),
  auditNotifications: z.array(AuditNotification).max(1).optional(),
  pendingUpdateParams: PendingUpdateParams,
});
export type ResourceOnDB = z.infer<typeof ResourceOnDB>;

// Type for passing audit Item from Stamp Catalog to Stamp Hub
export const ResourceAuditItem = z.object({
  type: z.enum(["permission"]),
  name: z.string().max(128),
  values: z.array(z.string().max(128)),
});
export type ResourceAuditItem = z.infer<typeof ResourceAuditItem>;

// Type for passing audit information to Stamp Front Plugin
export const ResourceAuditInfo = z.object({
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  auditItems: z.array(ResourceAuditItem),
});
export type ResourceAuditInfo = z.infer<typeof ResourceAuditInfo>;
