import { z } from "zod";

export const ResourceAuditNotificationProperty = z.object({
  notificationCategory: z.literal("ResourceAudit"),
  catalogId: z.string().min(1).max(128),
  resourceTypeId: z.string().min(1).max(128),
  resourceId: z.string().min(1).max(128),
  notificationTypeId: z.string().max(512),
  channelProperties: z.string().max(512),
});
export type ResourceAuditNotificationProperty = z.infer<typeof ResourceAuditNotificationProperty>;
