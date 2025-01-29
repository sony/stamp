import { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { createLogger } from "@stamp-lib/stamp-logger";
import { IdentityProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { z } from "zod";
import { createAccountLinkProvider } from "./accountLink";
import { createAccountLinkSessionProvider } from "./accountLinkSession";
import { createGroupProvider } from "./group";
import { createGroupMemberShipProvider } from "./groupMemberShip";
import { createUserProvider } from "./user";

export const DynamodbIdentityPluginConfig = z.object({
  tableNamePrefix: z.string(),
  tableCategoryName: z.string().default("dynamodb-identity"),
  region: z.string().optional(),
  logLevel: z.enum(["FATAL", "ERROR", "WARN", "INFO", "DEBUG"]).default("INFO"),
});
export type DynamodbIdentityPluginConfigInput = z.input<typeof DynamodbIdentityPluginConfig>;
export type DynamodbIdentityPluginConfig = z.output<typeof DynamodbIdentityPluginConfig>;

export function createDynamodbIdentityPlugin(config: DynamodbIdentityPluginConfigInput): IdentityProvider {
  const parsedConfig = DynamodbIdentityPluginConfig.parse(config);
  const tableBaseName = `${parsedConfig.tableNamePrefix}-${parsedConfig.tableCategoryName}`;
  const dynamodbConfig: DynamoDBClientConfig = { region: parsedConfig.region };

  const logger = createLogger(parsedConfig.logLevel, { moduleName: "dynamodb-identity" });
  const accountLink = createAccountLinkProvider(logger)(`${tableBaseName}-AccountLink`, dynamodbConfig);
  const accountLinkSession = createAccountLinkSessionProvider(logger)(`${tableBaseName}-AccountLinkSession`, dynamodbConfig);
  const group = createGroupProvider(logger)(`${tableBaseName}-Group`, dynamodbConfig);
  const groupMemberShip = createGroupMemberShipProvider(logger)(`${tableBaseName}-GroupMemberShip`, dynamodbConfig);
  const user = createUserProvider(logger)(`${tableBaseName}-User`, dynamodbConfig);
  return {
    accountLink,
    accountLinkSession,
    group,
    groupMemberShip,
    user,
  };
}
