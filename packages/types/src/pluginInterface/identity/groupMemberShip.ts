import { z } from "zod";
import { ResultAsync } from "neverthrow";
import { IdentityPluginError } from "./error";
import { Option } from "@stamp-lib/stamp-option";

import { GroupId } from "./group";
import { UserId } from "./user";

export const GroupMemberShipRole = z.enum(["owner", "member"]);
export type GroupMemberShipRole = z.infer<typeof GroupMemberShipRole>;

export const GroupMemberShip = z.object({
  groupId: GroupId,
  userId: UserId,
  role: GroupMemberShipRole,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GroupMemberShip = z.infer<typeof GroupMemberShip>;

export const GetGroupMemberShipInput = z.object({
  groupId: GroupId,
  userId: UserId,
});
export type GetGroupMemberShipInput = z.infer<typeof GetGroupMemberShipInput>;
export type GetGroupMemberShipOutput = ResultAsync<Option<GroupMemberShip>, IdentityPluginError>;
export type GetGroupMemberShip = (input: GetGroupMemberShipInput) => GetGroupMemberShipOutput;

export const ListGroupMemberShipByGroupInput = z.object({
  groupId: GroupId,
  limit: z.number().int().min(1).max(100).optional(),
  paginationToken: z.string().optional(),
});
export type ListGroupMemberShipByGroupInput = z.infer<typeof ListGroupMemberShipByGroupInput>;
export type ListGroupMemberShipByGroupOutput = ResultAsync<{ items: Array<GroupMemberShip>; nextPaginationToken?: string }, IdentityPluginError>;
export type ListGroupMemberShipByGroup = (input: ListGroupMemberShipByGroupInput) => ListGroupMemberShipByGroupOutput;

export const ListGroupMemberShipByUserInput = z.object({
  userId: UserId,
  limit: z.number().int().min(1).max(100).optional(),
  paginationToken: z.string().optional(),
});
export type ListGroupMemberShipByUserInput = z.infer<typeof ListGroupMemberShipByUserInput>;
export type ListGroupMemberShipByUserOutput = ResultAsync<{ items: Array<GroupMemberShip>; nextPaginationToken?: string }, IdentityPluginError>;
export type ListGroupMemberShipByUser = (input: ListGroupMemberShipByUserInput) => ListGroupMemberShipByUserOutput;

export const CreateGroupMemberShipInput = z.object({
  groupId: GroupId,
  userId: UserId,
  role: GroupMemberShipRole,
});
export type CreateGroupMemberShipInput = z.infer<typeof CreateGroupMemberShipInput>;
export type CreateGroupMemberShipOutput = ResultAsync<GroupMemberShip, IdentityPluginError>;
export type CreateGroupMemberShip = (input: CreateGroupMemberShipInput) => CreateGroupMemberShipOutput;

export const DeleteGroupMemberShipInput = z.object({
  groupId: GroupId,
  userId: UserId,
});
export type DeleteGroupMemberShipInput = z.infer<typeof DeleteGroupMemberShipInput>;
export type DeleteGroupMemberShipOutput = ResultAsync<void, IdentityPluginError>;
export type DeleteGroupMemberShip = (input: DeleteGroupMemberShipInput) => DeleteGroupMemberShipOutput;

export const UpdateGroupMemberShipInput = z.object({
  groupId: GroupId,
  userId: UserId,
  role: GroupMemberShipRole,
});
export type UpdateGroupMemberShipInput = z.infer<typeof UpdateGroupMemberShipInput>;
export type UpdateGroupMemberShipOutput = ResultAsync<GroupMemberShip, IdentityPluginError>;
export type UpdateGroupMemberShip = (input: UpdateGroupMemberShipInput) => UpdateGroupMemberShipOutput;

export const CountGroupMemberShipInput = z.object({
  groupId: GroupId,
});
export type CountGroupMemberShipInput = z.infer<typeof CountGroupMemberShipInput>;
export type CountGroupMemberShipOutput = ResultAsync<number, IdentityPluginError>;
export type CountGroupMemberShip = (input: CountGroupMemberShipInput) => CountGroupMemberShipOutput;

export type GroupMemberShipProvider = {
  get: GetGroupMemberShip;
  listByGroup: ListGroupMemberShipByGroup;
  listByUser: ListGroupMemberShipByUser;
  create: CreateGroupMemberShip;
  delete: DeleteGroupMemberShip;
  update: UpdateGroupMemberShip;
  count: CountGroupMemberShip;
};
