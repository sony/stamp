import { z } from "zod";

/**
 * A GitHub organization allowed to on-board repositories as `github-iam-role`
 * resources. `id` is the immutable numeric organization ID (as a decimal
 * string, to avoid int64 precision issues) required by GitHub's immutable
 * OIDC subject claims (`repo:ORG@ORG_ID/REPO@REPO_ID:...`). Obtain it via
 * `GET https://api.github.com/orgs/{org}` (`id` field).
 */
export const GitHubOrg = z.object({
  name: z.string().min(1),
  id: z.string().regex(/^[0-9]+$/, "GitHub organization ID must be a numeric string"),
});
export type GitHubOrg = z.infer<typeof GitHubOrg>;

export const IamRoleCatalogConfig = z.object({
  region: z.string(),
  iamRoleFactoryAccountId: z.string(),
  iamRoleFactoryAccountRoleArn: z.string(),
  /**
   * Allow-list of GitHub organizations whose repositories can be on-boarded as
   * `github-iam-role` resources. Users must pick one of these values when
   * creating a resource. Configuring an explicit allow-list (instead of letting
   * users type any org name) prevents typo-driven security incidents.
   * Duplicate names are rejected because two entries with the same name but
   * different IDs would make the name→ID lookup ambiguous.
   */
  gitHubOrgs: z
    .array(GitHubOrg)
    .nonempty()
    .superRefine((orgs, ctx) => {
      const names = new Set<string>();
      for (const org of orgs) {
        if (names.has(org.name)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate GitHub organization "${org.name}"` });
        }
        names.add(org.name);
      }
    }),
  policyNamePrefix: z.string(),
  roleNamePrefix: z.string(),
  awsAccountResourceTableName: z.string(),
  targetIamRoleResourceTableName: z.string(),
  gitHubIamRoleResourceTableName: z.string(),
  jumpIamRoleResourceTableName: z.string(),
  logLevel: z.enum(["FATAL", "ERROR", "WARN", "INFO", "DEBUG"]).default("INFO"),
});
export type IamRoleCatalogConfigInput = z.input<typeof IamRoleCatalogConfig>;
export type IamRoleCatalogConfig = z.output<typeof IamRoleCatalogConfig>;

/**
 * Looks up a GitHub organization in the configured allow-list by name.
 * Returns `undefined` when the org is not allowed.
 */
export const findAllowedGitHubOrg = (config: IamRoleCatalogConfig, gitHubOrgName: string): GitHubOrg | undefined =>
  config.gitHubOrgs.find((org) => org.name === gitHubOrgName);
