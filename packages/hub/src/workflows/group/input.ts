import {
  GroupId,
  GroupMemberShipRole,
  CreateGroupInput as PluginCreateGroupInput,
  CreateGroupMemberNotificationInput as PluginCreateGroupMemberNotificationInput,
  UpdateGroupMemberNotificationInput as PluginUpdateGroupMemberNotificationInput,
  DeleteGroupMemberNotificationInput as PluginDeleteGroupMemberNotificationInput,
  CreateApprovalRequestNotificationInput as PluginCreateApprovalRequestNotificationInput,
  UpdateApprovalRequestNotificationInput as PluginUpdateApprovalRequestNotificationInput,
  DeleteApprovalRequestNotificationInput as PluginDeleteApprovalRequestNotificationInput,
  ListGroupInput as PluginListGroupInput,
  UpdateGroupInput as PluginUpdateGroupInput,
  UserId,
} from "@stamp-lib/stamp-types/pluginInterface/identity";
import { z } from "zod";

export const AddUserToGroupInput = z.object({
  groupId: GroupId,
  targetUserId: UserId,
  role: GroupMemberShipRole,
  requestUserId: UserId,
});
export type AddUserToGroupInput = z.infer<typeof AddUserToGroupInput>;

export const RemoveUserFromGroupInput = z.object({
  groupId: GroupId,
  targetUserId: UserId,
  requestUserId: UserId,
});
export type RemoveUserFromGroupInput = z.infer<typeof RemoveUserFromGroupInput>;

export const DeleteGroupInput = z.object({
  groupId: GroupId,
  requestUserId: UserId,
});
export type DeleteGroupInput = z.infer<typeof DeleteGroupInput>;

export const UpdateGroupInput = PluginUpdateGroupInput.extend({
  requestUserId: UserId,
});
export type UpdateGroupInput = z.infer<typeof UpdateGroupInput>;

export const GetGroupInput = z.object({
  groupId: GroupId,
  requestUserId: UserId,
});
export type GetGroupInput = z.infer<typeof GetGroupInput>;

export const ListGroupMemberShipByGroupInput = z.object({
  groupId: GroupId,
  requestUserId: UserId,
  limit: z.number().int().min(1).max(200).optional(),
  pagenationToken: z.string().optional(),
});
export type ListGroupMemberShipByGroupInput = z.infer<typeof ListGroupMemberShipByGroupInput>;

export const CreateGroupInput = PluginCreateGroupInput.extend({
  requestUserId: UserId,
});
export type CreateGroupInput = z.infer<typeof CreateGroupInput>;

export const ListGroupMemberShipByUserInput = z.object({
  requestUserId: UserId,
});
export type ListGroupMemberShipByUserInput = z.infer<typeof ListGroupMemberShipByUserInput>;

export const ListGroupInput = PluginListGroupInput.extend({
  requestUserId: UserId,
});
export type ListGroupInput = z.infer<typeof ListGroupInput>;

export const DeleteGroupMemberNotificationInput = PluginDeleteGroupMemberNotificationInput.extend({
  requestUserId: UserId,
});
export type DeleteGroupMemberNotificationInput = z.infer<typeof DeleteGroupMemberNotificationInput>;

export const UpdateGroupMemberNotificationInput = PluginUpdateGroupMemberNotificationInput.extend({
  requestUserId: UserId,
});
export type UpdateGroupMemberNotificationInput = z.infer<typeof UpdateGroupMemberNotificationInput>;

export const CreateGroupMemberNotificationInput = PluginCreateGroupMemberNotificationInput.extend({
  requestUserId: UserId,
});
export type CreateGroupMemberNotificationInput = z.infer<typeof CreateGroupMemberNotificationInput>;

export const CreateApprovalRequestNotificationInput = PluginCreateApprovalRequestNotificationInput.extend({
  requestUserId: UserId,
});
export type CreateApprovalRequestNotificationInput = z.infer<typeof CreateApprovalRequestNotificationInput>;

export const UpdateApprovalRequestNotificationInput = PluginUpdateApprovalRequestNotificationInput.extend({
  requestUserId: UserId,
});
export type UpdateApprovalRequestNotificationInput = z.infer<typeof UpdateApprovalRequestNotificationInput>;

export const DeleteApprovalRequestNotificationInput = PluginDeleteApprovalRequestNotificationInput.extend({
  requestUserId: UserId,
});
export type DeleteApprovalRequestNotificationInput = z.infer<typeof DeleteApprovalRequestNotificationInput>;
