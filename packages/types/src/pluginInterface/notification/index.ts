import { ResultAsync } from "neverthrow";
import { NotificationError } from "./error";
import { z } from "zod";
import { NotificationChannel } from "../../models/notificationChannel";
import { NotificationType, ResourceAuditItem } from "../../models";
import { PendingRequest } from "../../models";
import { InputParamWithName, InputResourceWithName } from "../../models/approvalRequest";
// Define NotificationMessage types

export const ResourceAuditMessage = z.object({
  type: z.literal("ResourceAudit"),
  property: z.object({
    catalogId: z.string(),
    catalogName: z.string(),
    resourceTypeId: z.string(),
    resourceTypeName: z.string(),
    resourceId: z.string(),
    resourceName: z.string(),
    ResourceAuditItem: z.array(ResourceAuditItem),
  }),
});
export type ResourceAuditMessage = z.infer<typeof ResourceAuditMessage>;

export const GroupMemberAddedEventMessage = z.object({
  type: z.literal("GroupMemberAddedEvent"),
  property: z.object({
    groupId: z.string(),
    groupName: z.string(),
    addedUserId: z.string(),
    addedUserName: z.string(),
    timeStamp: z.string().datetime(),
    requesterUserId: z.string(),
    requesterUserName: z.string(),
  }),
});
export type GroupMemberAddedEventMessage = z.infer<typeof GroupMemberAddedEventMessage>;

export const ApprovalRequestEventMessage = z.object({
  type: z.literal("ApprovalRequestEvent"),
  property: z.object({
    request: PendingRequest,
    inputParamsWithNames: z.array(InputParamWithName),
    inputResourcesWithNames: z.array(InputResourceWithName),
  }),
});
export type ApprovalRequestEventMessage = z.infer<typeof ApprovalRequestEventMessage>;

export const NotificationMessage = z.union([ResourceAuditMessage, GroupMemberAddedEventMessage, ApprovalRequestEventMessage]);
export type NotificationMessage = z.infer<typeof NotificationMessage>;

// Define NotificationProvider interface
export const SetChannelInput = z.object({ properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])), message: z.string() });
export type SetChannelInput = z.infer<typeof SetChannelInput>;

export const UnsetChannelInput = NotificationChannel.pick({ id: true }).merge(z.object({ message: z.string() }));
export type UnsetChannelInput = z.infer<typeof UnsetChannelInput>;

export const SendNotificationInput = z.object({
  message: NotificationMessage,
  channel: NotificationChannel,
});
export type SendNotificationInput = z.infer<typeof SendNotificationInput>;

export interface NotificationProvider {
  setChannel: (notification: SetChannelInput) => ResultAsync<NotificationChannel, NotificationError>;
  unsetChannel: (notification: UnsetChannelInput) => ResultAsync<void, NotificationError>;
  sendNotification: (notification: SendNotificationInput) => ResultAsync<void, NotificationError>;
}

// Define NotificationPlugin Config types
export const NotificationPluginConfig = NotificationType.merge(
  z.object({
    handlers: z.any().transform((v) => v as NotificationProvider),
  })
);
export type NotificationPluginConfig = z.infer<typeof NotificationPluginConfig>;

export * from "./error";
