import { DBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { createApprovalFlowDBProvider } from "./approvalFlow";
import { createApprovalRequestDBProvider } from "./approvalRequest";
import { createCatalogDBProvider } from "./catalog";
import { createResourceDBProvider } from "./resource";
import { createLogger } from "@stamp-lib/stamp-logger";
import { z } from "zod";

export const EphemeralDBPluginConfig = z.object({
  logLevel: z.enum(["FATAL", "ERROR", "WARN", "INFO", "DEBUG"]).default("INFO"),
});
export type EphemeralDBPluginConfigInput = z.input<typeof EphemeralDBPluginConfig>;
export type EphemeralDBPluginConfig = z.output<typeof EphemeralDBPluginConfig>;

export function createEphemeralDBPlugin(config: EphemeralDBPluginConfig): DBProvider {
  const parsedConfig = EphemeralDBPluginConfig.parse(config);

  const logger = createLogger(parsedConfig.logLevel, { moduleName: "ephemeral-db" });
  const approvalFlowDB = createApprovalFlowDBProvider(logger);
  const approvalRequestDB = createApprovalRequestDBProvider(logger);
  const catalogDB = createCatalogDBProvider(logger);
  const resourceDB = createResourceDBProvider(logger);

  return {
    approvalFlowDB,
    approvalRequestDB,
    catalogDB,
    resourceDB,
  };
}
