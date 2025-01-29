import { Option } from "@stamp-lib/stamp-option";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import { IdentityPluginError } from "./error";

export const UserId = z.string().uuid();
export type UserId = z.infer<typeof UserId>;

export const User = z.object({
  userId: UserId,
  userName: z.string().max(256),
  email: z.string().email(),
  role: z.array(z.enum(["Admin"])).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof User>;

export const GetUserInput = z.object({
  userId: UserId,
});
export type GetUserInput = z.infer<typeof GetUserInput>;
export type GetUserOutput = ResultAsync<Option<User>, IdentityPluginError>;
export type GetUser = (input: GetUserInput) => GetUserOutput;

export const ListUserInput = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  paginationToken: z.string().optional(),
});
export type ListUserInput = z.infer<typeof ListUserInput>;
export type ListUserOutput = ResultAsync<{ users: Array<User>; nextPaginationToken?: string }, IdentityPluginError>;
export type ListUser = (input: ListUserInput) => ListUserOutput;

export const CreateUserInput = z.object({
  userName: z.string().max(256),
  email: z.string().email(),
});
export type CreateUserInput = z.infer<typeof CreateUserInput>;
export type CreateUserOutput = ResultAsync<User, IdentityPluginError>;
export type CreateUser = (input: CreateUserInput) => CreateUserOutput;

export const DeleteUserInput = z.object({
  userId: UserId,
});
export type DeleteUserInput = z.infer<typeof DeleteUserInput>;
export type DeleteUserOutput = ResultAsync<void, IdentityPluginError>;
export type DeleteUser = (input: DeleteUserInput) => DeleteUserOutput;

export const UpdateUserInput = z.object({
  userId: UserId,
  userName: z.string().max(256),
  email: z.string().email(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;
export type UpdateUserOutput = ResultAsync<User, IdentityPluginError>;
export type UpdateUser = (input: UpdateUserInput) => UpdateUserOutput;

export type UserProvider = {
  get: GetUser;
  list: ListUser;
  create: CreateUser;
  delete: DeleteUser;
  update: UpdateUser;
};
