export * from "./approvalFlow";
export * from "./catalog";
export * from "./error";
export * from "./notificationPlugin";

import { ApprovalFlowConfigProvider } from "./approvalFlow";
import { CatalogInfoOnConfigProvider, CatalogConfigProvider, RegisterCatalogConfigProvider } from "./catalog";
import { NotificationPluginConfigProvider } from "./notificationPlugin";

export type ConfigProvider = {
  approvalFlow: ApprovalFlowConfigProvider;
  catalogInfo: CatalogInfoOnConfigProvider;
  catalogConfig: CatalogConfigProvider;
  notificationPlugin: NotificationPluginConfigProvider;
  registerCatalogConfig: RegisterCatalogConfigProvider;
};
