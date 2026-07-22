import { z } from "zod";

/**
 * Bare GitHub repository name (without org prefix). This is what the user
 * enters in the create form and what we render in the UI. Restricted to the
 * characters GitHub itself allows in repository names — in particular `/`,
 * `@`, `:` and whitespace are rejected because the name is embedded in both
 * the compound DynamoDB PK (`org/repo[/suffix]`) and the OIDC subject claim,
 * where those characters act as delimiters.
 */
export const GitHubRepositoryNameField = z
  .string()
  .regex(/^[a-zA-Z0-9_.-]+$/, "GitHub repository name may only contain alphanumeric characters, hyphens, underscores, and periods");

/**
 * GitHub organization name. New resources require it; persisted records
 * created before multi-org support may not have it (handled by the read path).
 * Same delimiter-safety rationale as the repository name.
 */
export const GitHubOrgNameField = z
  .string()
  .regex(/^[a-zA-Z0-9-]+$/, "GitHub organization name may only contain alphanumeric characters and hyphens");

/**
 * Immutable numeric GitHub repository ID, as a decimal string (int64-safe).
 * Required for the immutable OIDC subject claim format
 * `repo:ORG@ORG_ID/REPO@REPO_ID:...`. Obtain it via
 * `GET https://api.github.com/repos/{owner}/{repo}` (`id` field).
 */
export const GitHubRepositoryIdField = z.string().regex(/^[0-9]+$/, "GitHub repository ID must be a numeric string");

/** Immutable numeric GitHub organization ID, as a decimal string. */
export const GitHubOrgIdField = z.string().regex(/^[0-9]+$/, "GitHub organization ID must be a numeric string");

/**
 * Optional user-chosen suffix that distinguishes multiple IAM roles for the
 * same repository. It becomes part of both the IAM role name and the
 * resourceId, so it must be filesystem/IAM-safe. When omitted, the role name
 * and resourceId keep the pre-suffix single-role format, which lets existing
 * roles be deleted and recreated under the same name.
 */
export const RoleSuffixField = z
  .string()
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,30}[a-zA-Z0-9])?$/, "roleSuffix must be 1-32 alphanumeric/hyphen characters, starting and ending alphanumeric");

/**
 * Scope of the OIDC subject claim condition:
 * - `repository` (default): whole repository, `repo:ORG@ID/REPO@ID:*`
 * - `branch` / `tag` / `environment`: a single ref or environment (requires `subjectValue`)
 * - `pull_request`: pull-request-triggered workflows only
 */
export const SubjectTypeField = z.enum(["repository", "branch", "environment", "tag", "pull_request"]).default("repository");
export type SubjectType = z.infer<typeof SubjectTypeField>;

/** Subject types whose sub condition embeds a user-supplied value. */
export const SubjectTypeWithValue = z.enum(["branch", "environment", "tag"]);
/** Subject types that take no value. Defaults to `repository` when omitted. */
export const SubjectTypeWithoutValue = z.enum(["repository", "pull_request"]).default("repository");

/**
 * Branch / tag / environment name embedded verbatim in the sub condition.
 * Wildcard characters are rejected: the condition uses StringLike, and a `*`
 * or `?` inside the value would silently widen the trust policy scope.
 */
export const SubjectValueField = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => !/[*?]/.test(value), "subjectValue must not contain wildcard characters (* or ?)");

const CreateGitHubIamRoleNameCommandCommonFields = {
  repositoryName: GitHubRepositoryNameField,
  gitHubOrgName: GitHubOrgNameField,
  repositoryId: GitHubRepositoryIdField,
  roleSuffix: RoleSuffixField.optional(),
};

// Union couples subjectType to subjectValue cardinality: branch/environment/tag
// require a value, repository/pull_request forbid one. Modeling this in the
// schema (instead of an after-the-fact refine) keeps every downstream consumer
// of the parsed command working with a valid pairing.
const ValueScopedCommandOption = z.object({
  ...CreateGitHubIamRoleNameCommandCommonFields,
  subjectType: SubjectTypeWithValue,
  subjectValue: SubjectValueField,
});
const RepoScopedCommandOption = z.object({
  ...CreateGitHubIamRoleNameCommandCommonFields,
  subjectType: SubjectTypeWithoutValue,
  subjectValue: z.undefined().optional(),
});

export const CreateGitHubIamRoleNameCommand = z.union([ValueScopedCommandOption, RepoScopedCommandOption]);
export type CreateGitHubIamRoleNameCommand = z.infer<typeof CreateGitHubIamRoleNameCommand>;

const CreatedGitHubIamRoleNameFields = {
  iamRoleName: z.string(),
  gitHubOrgId: GitHubOrgIdField,
  /** Fully assembled OIDC subject claim condition written to the trust policy. */
  subject: z.string().min(1),
};

export const CreatedGitHubIamRoleName = z.union([
  ValueScopedCommandOption.extend(CreatedGitHubIamRoleNameFields),
  RepoScopedCommandOption.extend(CreatedGitHubIamRoleNameFields),
]);
export type CreatedGitHubIamRoleName = z.infer<typeof CreatedGitHubIamRoleName>;

export const CreateGitHubIamRoleCommand = CreatedGitHubIamRoleName;
export type CreateGitHubIamRoleCommand = z.infer<typeof CreateGitHubIamRoleCommand>;

const CreatedGitHubIamRoleFields = {
  ...CreatedGitHubIamRoleNameFields,
  iamRoleArn: z.string(),
  createdAt: z.string().datetime(),
};

export const CreatedGitHubIamRole = z.union([
  ValueScopedCommandOption.extend(CreatedGitHubIamRoleFields),
  RepoScopedCommandOption.extend(CreatedGitHubIamRoleFields),
]);
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
  // Immutable-claims era attributes. Absent on records created before this
  // support landed (including multi-org records) — same leniency as above.
  gitHubRepositoryId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  gitHubOrgId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  roleSuffix: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  subjectType: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  subjectValue: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  // The exact OIDC subject condition written to the trust policy, persisted
  // for auditability (the trust policy itself is never updated after create).
  subject: z
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
