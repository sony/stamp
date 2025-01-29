import { z } from "zod";

export const CreateGitHubIamRoleNameCommand = z.object({
  repositoryName: z.string(),
});
export type CreateGitHubIamRoleNameCommand = z.infer<typeof CreateGitHubIamRoleNameCommand>;

export const CreatedGitHubIamRoleName = CreateGitHubIamRoleNameCommand.merge(z.object({ iamRoleName: z.string() }));
export type CreatedGitHubIamRoleName = z.infer<typeof CreatedGitHubIamRoleName>;

export const CreateGitHubIamRoleCommand = CreatedGitHubIamRoleName;
export type CreateGitHubIamRoleCommand = z.infer<typeof CreateGitHubIamRoleCommand>;

export const CreatedGitHubIamRole = CreatedGitHubIamRoleName.merge(z.object({ iamRoleArn: z.string(), createdAt: z.string().datetime() }));
export type CreatedGitHubIamRole = z.infer<typeof CreatedGitHubIamRole>;

export const GitHubIamRole = CreatedGitHubIamRole;
export type GitHubIamRole = z.infer<typeof GitHubIamRole>;

export const ListGitHubIamRoleAuditItemCommand = z.object({
  attachedPolicyArns: z.array(z.string()),
});
export type ListGitHubIamRoleAuditItemCommand = z.infer<typeof ListGitHubIamRoleAuditItemCommand>;

export const ListGitHubIamRoleAuditItem = z.object({
  items: z.array(z.string()),
});
export type ListGitHubIamRoleAuditItem = z.infer<typeof ListGitHubIamRoleAuditItem>;
