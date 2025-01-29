import { z } from "zod";

export const IamRoleCatalogConfig = z.object({
  region: z.string(),
  iamRoleFactoryAccountId: z.string(),
  iamRoleFactoryAccountRoleArn: z.string(),
  gitHubOrgName: z.string(),
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
