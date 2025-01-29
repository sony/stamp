import { z } from "zod";

export const CreateTargetIamRoleCommand = z.object({
  accountId: z.string(),
  iamRoleName: z.string(),
});
export const CreateTargetIamRoleCommandInput = CreateTargetIamRoleCommand.merge(
  z.object({
    prefixName: z.string(),
  })
);
export type CreateTargetIamRoleCommand = z.infer<typeof CreateTargetIamRoleCommandInput>;

export const CreatedTargetIamRole = CreateTargetIamRoleCommand.merge(
  z.object({
    id: z.string(), // ID Format: {accountId}#{iamRoleName}
    createdAt: z.string().datetime(),
    assumeRolePolicyArn: z.string(),
  })
);
export type CreatedTargetIamRole = z.infer<typeof CreatedTargetIamRole>;

export const TargetIamRole = CreatedTargetIamRole;
export type TargetIamRole = z.infer<typeof TargetIamRole>;

export const PromoteTargetIamRoleCommand = TargetIamRole;
export type PromoteTargetIamRoleCommand = z.infer<typeof PromoteTargetIamRoleCommand>;

export const DemoteTargetIamRoleCommand = TargetIamRole;
export type DemoteTargetIamRoleCommand = z.infer<typeof DemoteTargetIamRoleCommand>;
