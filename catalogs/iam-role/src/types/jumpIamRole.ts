import { z } from "zod";

export const CreateJumpIamRoleNameCommand = z.object({
  jumpIamRoleName: z.string(),
  originIamRoleArn: z.string(),
});
export type CreateJumpIamRoleNameCommand = z.infer<typeof CreateJumpIamRoleNameCommand>;

export const CreatedJumpIamRoleName = CreateJumpIamRoleNameCommand.merge(z.object({ iamRoleName: z.string() }));
export type CreatedJumpIamRoleName = z.infer<typeof CreatedJumpIamRoleName>;

export const CreateJumpIamRoleCommand = CreatedJumpIamRoleName;
export type CreateJumpIamRoleCommand = z.infer<typeof CreateJumpIamRoleCommand>;

export const CreatedJumpIamRole = CreatedJumpIamRoleName.merge(z.object({ iamRoleArn: z.string(), createdAt: z.string().datetime() }));
export type CreatedJumpIamRole = z.infer<typeof CreatedJumpIamRole>;

export const JumpIamRole = CreatedJumpIamRole;
export type JumpIamRole = z.infer<typeof JumpIamRole>;

export const ListJumpIamRoleAuditItemCommand = z.object({
  attachedPolicyArns: z.array(z.string()),
});
export type ListJumpIamRoleAuditItemCommand = z.infer<typeof ListJumpIamRoleAuditItemCommand>;

export const ListJumpIamRoleAuditItem = z.object({
  items: z.array(z.string()),
});
export type ListJumpIamRoleAuditItem = z.infer<typeof ListJumpIamRoleAuditItem>;
