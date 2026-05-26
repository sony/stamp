import { z } from "zod";

export const IamRoleCatalogConfig = z.object({
  region: z.string(),
  iamRoleFactoryAccountId: z.string(),
  iamRoleFactoryAccountRoleArn: z.string(),
  /**
   * Allow-list of GitHub organizations whose repositories can be on-boarded as
   * `github-iam-role` resources. Users must pick one of these values when
   * creating a resource. Configuring an explicit allow-list (instead of letting
   * users type any org name) prevents typo-driven security incidents.
   */
  gitHubOrgNames: z.array(z.string().min(1)).nonempty(),
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
