import { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { createLogger } from "@stamp-lib/stamp-logger";
import { DBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { z } from "zod";
import { createApprovalFlowDBProvider } from "./approvalFlow";
import { createApprovalRequestDBProvider } from "./approvalRequest";
import { createCatalogDBProvider } from "./catalog";
import { createResourceDBProvider } from "./resource";

export const DynamodbDBPluginConfig = z.object({
  tableNamePrefix: z.string(),
  tableCategoryName: z.string().default("dynamodb-db"),
  region: z.string().optional(),
  logLevel: z.enum(["FATAL", "ERROR", "WARN", "INFO", "DEBUG"]).default("INFO"),
});
export type DynamodbDBPluginConfigInput = z.input<typeof DynamodbDBPluginConfig>;
export type DynamodbDBPluginConfig = z.output<typeof DynamodbDBPluginConfig>;

export function createDynamodbDBPlugin(config: DynamodbDBPluginConfigInput): DBProvider {
  const parsedConfig = DynamodbDBPluginConfig.parse(config);
  const tableBaseName = `${parsedConfig.tableNamePrefix}-${parsedConfig.tableCategoryName}`;
  const dynamodbConfig: DynamoDBClientConfig = { region: parsedConfig.region };

  const logger = createLogger(parsedConfig.logLevel, { moduleName: "dynamodb-db" });
  const approvalFlowDB = createApprovalFlowDBProvider(logger)(`${tableBaseName}-ApprovalFlow`, dynamodbConfig);
  const approvalRequestDB = createApprovalRequestDBProvider(logger)(`${tableBaseName}-ApprovalRequest`, dynamodbConfig);
  const catalogDB = createCatalogDBProvider(logger)(`${tableBaseName}-Catalog`, dynamodbConfig);
  const resourceDB = createResourceDBProvider(logger)(`${tableBaseName}-Resource`, dynamodbConfig);

  return {
    approvalFlowDB,
    approvalRequestDB,
    catalogDB,
    resourceDB,
  };
}
