import { z } from "zod";

/**
 * Bare GitHub repository name (without org prefix). This is what the user
 * enters in the create form and what we render in the UI. Must be non-empty.
 */
const GitHubRepositoryNameField = z.string().min(1);

/**
 * GitHub organization name. New resources require it; persisted records
 * created before multi-org support may not have it (handled by the read path).
 */
const GitHubOrgNameField = z.string().min(1);

export const CreateGitHubIamRoleNameCommand = z.object({
  repositoryName: GitHubRepositoryNameField,
  gitHubOrgName: GitHubOrgNameField,
});
export type CreateGitHubIamRoleNameCommand = z.infer<typeof CreateGitHubIamRoleNameCommand>;

export const CreatedGitHubIamRoleName = CreateGitHubIamRoleNameCommand.merge(z.object({ iamRoleName: z.string() }));
export type CreatedGitHubIamRoleName = z.infer<typeof CreatedGitHubIamRoleName>;

export const CreateGitHubIamRoleCommand = CreatedGitHubIamRoleName;
export type CreateGitHubIamRoleCommand = z.infer<typeof CreateGitHubIamRoleCommand>;

export const CreatedGitHubIamRole = CreatedGitHubIamRoleName.merge(z.object({ iamRoleArn: z.string(), createdAt: z.string().datetime() }));
export type CreatedGitHubIamRole = z.infer<typeof CreatedGitHubIamRole>;

/**
 * Persisted GitHub IAM Role record (DynamoDB item / Stamp resource).
 *
 * `repositoryName` here is the **DDB primary key value** and also the Stamp
 * `resourceId`. For records created with multi-org support it is the compound
 * `${gitHubOrgName}/${gitHubRepositoryName}`. For records created before
 * multi-org support it is the bare repo name (legacy).
 *
 * `gitHubRepositoryName` and `gitHubOrgName` are optional on the schema level
 * to allow legacy records (which only persisted `repositoryName`) to be parsed.
 * For legacy records the read path derives the bare repository name from the
 * PK (which IS the bare name for legacy records) but does NOT infer the org —
 * it is returned as `undefined` so callers must handle the missing value
 * explicitly. Silently defaulting to the first allowlist entry was rejected as
 * misleading (it could misattribute access to the wrong org).
 */
export const GitHubIamRole = z.object({
  repositoryName: z.string(),
  // Lenient on the persisted side: empty strings from stale/leaked records or
  // partial migrations must still parse. The handler-level read path applies
  // sensible fallbacks before exposing values to callers.
  gitHubRepositoryName: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  gitHubOrgName: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  iamRoleName: z.string(),
  iamRoleArn: z.string(),
  createdAt: z.string().datetime(),
});
export type GitHubIamRole = z.infer<typeof GitHubIamRole>;

export const ListGitHubIamRoleAuditItemCommand = z.object({
  attachedPolicyArns: z.array(z.string()),
});
export type ListGitHubIamRoleAuditItemCommand = z.infer<typeof ListGitHubIamRoleAuditItemCommand>;

export const ListGitHubIamRoleAuditItem = z.object({
  items: z.array(z.string()),
});
export type ListGitHubIamRoleAuditItem = z.infer<typeof ListGitHubIamRoleAuditItem>;
