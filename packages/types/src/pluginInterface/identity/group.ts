import { Option } from "@stamp-lib/stamp-option";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import { NotificationChannel } from "./../../models/notificationChannel";
import { IdentityPluginError } from "./error";

export const GroupId = z.string().uuid();
export type GroupId = z.infer<typeof GroupId>;

export const GroupName = z.string().max(256);
export type GroupName = z.infer<typeof GroupName>;

export const GroupDescription = z.string().max(1024);
export type GroupDescription = z.infer<typeof GroupDescription>;

export const GroupMemberNotification = z.object({
  id: z.string().uuid(),
  notificationChannel: NotificationChannel,
});

export const GroupMemberNotifications = z.array(GroupMemberNotification).max(1).optional();
export type GroupMemberNotifications = z.infer<typeof GroupMemberNotifications>;

export const approvalRequestNotification = z.object({
  id: z.string().uuid(),
  notificationChannel: NotificationChannel,
});

export const approvalRequestNotifications = z.array(approvalRequestNotification).max(1).optional();
export type approvalRequestNotifications = z.infer<typeof approvalRequestNotifications>;

export const Group = z.object({
  groupId: GroupId,
  groupName: GroupName,
  description: GroupDescription,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  groupMemberNotifications: GroupMemberNotifications,
  approvalRequestNotifications: approvalRequestNotifications,
});
export type Group = z.infer<typeof Group>;

export const GetGroupInput = z.object({
  groupId: GroupId,
});
export type GetGroupInput = z.infer<typeof GetGroupInput>;
export type GetGroupOutput = ResultAsync<Option<Group>, IdentityPluginError>;
export type GetGroup = (input: GetGroupInput) => GetGroupOutput;

export const ListGroupInput = z.object({
  groupNamePrefix: z.string().max(256).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  paginationToken: z.string().optional(),
});
export type ListGroupInput = z.infer<typeof ListGroupInput>;
export type ListGroupOutput = ResultAsync<{ items: Array<Group>; nextPaginationToken?: string }, IdentityPluginError>;
export type ListGroup = (input: ListGroupInput) => ListGroupOutput;

export const CreateGroupInput = z.object({
  groupName: GroupName,
  description: GroupDescription,
});
export type CreateGroupInput = z.infer<typeof CreateGroupInput>;
export type CreateGroupOutput = ResultAsync<Group, IdentityPluginError>;
export type CreateGroup = (input: CreateGroupInput) => CreateGroupOutput;

export const DeleteGroupInput = z.object({
  groupId: GroupId,
});
export type DeleteGroupInput = z.infer<typeof DeleteGroupInput>;
export type DeleteGroupOutput = ResultAsync<void, IdentityPluginError>;
export type DeleteGroup = (input: DeleteGroupInput) => DeleteGroupOutput;

export const UpdateGroupInput = z.object({
  groupId: GroupId,
  groupName: GroupName,
  description: GroupDescription,
});
export type UpdateGroupInput = z.infer<typeof UpdateGroupInput>;
export type UpdateGroupOutput = ResultAsync<Group, IdentityPluginError>;
export type UpdateGroup = (input: UpdateGroupInput) => UpdateGroupOutput;

export const CreateGroupMemberNotificationInput = GroupMemberNotification.omit({ id: true }).merge(z.object({ groupId: z.string() }));
export type CreateGroupMemberNotificationInput = z.infer<typeof CreateGroupMemberNotificationInput>;
export type CreateGroupMemberNotificationOutput = ResultAsync<Group, IdentityPluginError>;
export type CreateGroupMemberNotification = (input: CreateGroupMemberNotificationInput) => CreateGroupMemberNotificationOutput;

export const UpdateGroupMemberNotificationInput = GroupMemberNotification.omit({ id: true }).merge(
  z.object({ groupId: z.string(), notificationId: z.string() })
);
export type UpdateGroupMemberNotificationInput = z.infer<typeof UpdateGroupMemberNotificationInput>;
export type UpdateGroupMemberNotificationOutput = ResultAsync<Group, IdentityPluginError>;
export type UpdateGroupMemberNotification = (input: UpdateGroupMemberNotificationInput) => UpdateGroupMemberNotificationOutput;

export const DeleteGroupMemberNotificationInput = z.object({
  groupId: GroupId,
  notificationId: z.string().uuid(),
});
export type DeleteGroupMemberNotificationInput = z.infer<typeof DeleteGroupMemberNotificationInput>;
export type DeleteGroupMemberNotificationOutput = ResultAsync<Group, IdentityPluginError>;
export type DeleteGroupMemberNotification = (input: DeleteGroupMemberNotificationInput) => DeleteGroupMemberNotificationOutput;

export const CreateApprovalRequestNotificationInput = approvalRequestNotification.omit({ id: true }).merge(z.object({ groupId: z.string() }));
export type CreateApprovalRequestNotificationInput = z.infer<typeof CreateApprovalRequestNotificationInput>;
export type CreateApprovalRequestNotificationOutput = ResultAsync<Group, IdentityPluginError>;
export type CreateApprovalRequestNotification = (input: CreateApprovalRequestNotificationInput) => CreateApprovalRequestNotificationOutput;

export const UpdateApprovalRequestNotificationInput = approvalRequestNotification
  .omit({ id: true })
  .merge(z.object({ groupId: z.string(), notificationId: z.string() }));
export type UpdateApprovalRequestNotificationInput = z.infer<typeof UpdateApprovalRequestNotificationInput>;
export type UpdateApprovalRequestNotificationOutput = ResultAsync<Group, IdentityPluginError>;
export type UpdateApprovalRequestNotification = (input: UpdateApprovalRequestNotificationInput) => UpdateApprovalRequestNotificationOutput;

export const DeleteApprovalRequestNotificationInput = z.object({
  groupId: GroupId,
  notificationId: z.string().uuid(),
});
export type DeleteApprovalRequestNotificationInput = z.infer<typeof DeleteApprovalRequestNotificationInput>;
export type DeleteApprovalRequestNotificationOutput = ResultAsync<Group, IdentityPluginError>;
export type DeleteApprovalRequestNotification = (input: DeleteApprovalRequestNotificationInput) => DeleteApprovalRequestNotificationOutput;

export type GroupProvider = {
  get: GetGroup;
  list: ListGroup;
  create: CreateGroup;
  delete: DeleteGroup;
  update: UpdateGroup;
  createGroupMemberNotification: CreateGroupMemberNotification;
  updateGroupMemberNotification: UpdateGroupMemberNotification;
  deleteGroupMemberNotification: DeleteGroupMemberNotification;
  createApprovalRequestNotification: CreateApprovalRequestNotification;
  updateApprovalRequestNotification: UpdateApprovalRequestNotification;
  deleteApprovalRequestNotification: DeleteApprovalRequestNotification;
};
