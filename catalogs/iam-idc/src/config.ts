import { z } from "zod";

export const IamIdcCatalogConfig = z.object({
  region: z.string(),
  identityInstanceArn: z.string(),
  identityStoreId: z.string(),
  accountId: z.string(),
  accountManagementTableName: z.string(),
  permissionTableName: z.string(),
  logLevel: z.enum(["FATAL", "ERROR", "WARN", "INFO", "DEBUG"]).default("INFO"),
  permissionIdPrefix: z.string().max(2).default("SP"),
});
export type IamIdcCatalogConfigInput = z.input<typeof IamIdcCatalogConfig>;
export type IamIdcCatalogConfig = z.output<typeof IamIdcCatalogConfig>;
