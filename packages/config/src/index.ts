import { ConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { z } from "zod";
import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { NotificationPluginConfig } from "@stamp-lib/stamp-types/pluginInterface/notification";

import { createCatalogInfoOnConfigProvider } from "./catalogInfo";
import { createApprovalFlowConfigProvider } from "./approvalFlow";
import { createCatalogConfigProvider } from "./catalogConfig";
import { createNotificationPluginConfigProvider } from "./notification";
import { createRegisterCatalogConfigProvider } from "./registerCatalogConfig";

export type CatalogConfigMap = ReadonlyMap<string, Readonly<CatalogConfig>>;

export const CreateConfigInput = z.object({
  catalogs: z.array(CatalogConfig).max(50),
  notificationPlugins: z.array(NotificationPluginConfig).max(50).optional(),
});
export type CreateConfigInput = z.infer<typeof CreateConfigInput>;

export function createConfigProvider(input: CreateConfigInput): ConfigProvider {
  const parsedConfig = CreateConfigInput.parse(input);
  // Enable retrieval of CatalogConfig using the catalog's ID
  const catalogConfigMap = new Map<string, Readonly<CatalogConfig>>();
  parsedConfig.catalogs.forEach((catalogConfig) => {
    catalogConfigMap.set(catalogConfig.id, catalogConfig);
  });

  const notificationPluginMap = new Map<string, Readonly<NotificationPluginConfig>>();
  parsedConfig.notificationPlugins?.forEach((notificationPluginConfig) => {
    notificationPluginMap.set(notificationPluginConfig.id, notificationPluginConfig);
  });

  const catalogConfigProvider = createCatalogConfigProvider(catalogConfigMap);
  const catalogInfoOnConfigProvider = createCatalogInfoOnConfigProvider(catalogConfigMap);
  const approvalFlowConfigProvider = createApprovalFlowConfigProvider(catalogConfigMap);
  const notificationPluginConfigProvider = createNotificationPluginConfigProvider(notificationPluginMap);
  const registerCatalogConfigProvider = createRegisterCatalogConfigProvider(catalogConfigMap);
  return {
    catalogConfig: catalogConfigProvider,
    catalogInfo: catalogInfoOnConfigProvider,
    approvalFlow: approvalFlowConfigProvider,
    notificationPlugin: notificationPluginConfigProvider,
    registerCatalogConfig: registerCatalogConfigProvider,
  };
}
