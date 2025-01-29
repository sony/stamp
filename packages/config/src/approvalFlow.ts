import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { okAsync } from "neverthrow";
import { ApprovalFlowConfigProvider, GetApprovalFlowInfoOnConfigResult, ListApprovalFlowInfoOnConfigResult } from "@stamp-lib/stamp-types/configInterface";
import { some, none } from "@stamp-lib/stamp-option";

export const getApprovalFlowConfig =
  (catalogConfigMap: ReadonlyMap<string, Readonly<CatalogConfig>>) =>
  (catalogId: string, approvalFlowId: string): GetApprovalFlowInfoOnConfigResult => {
    const config = catalogConfigMap.get(catalogId);
    const approvalFlowConfig = config?.approvalFlows.find((approvalFlow) => approvalFlow.id === approvalFlowId);
    if (config == undefined || approvalFlowConfig == undefined) {
      return okAsync(none);
    } else {
      return okAsync(some({ ...approvalFlowConfig, catalogId: catalogId }));
    }
  };

export const listApprovalFlowConfig =
  (catalogConfigMap: ReadonlyMap<string, Readonly<CatalogConfig>>) =>
  (catalogId: string): ListApprovalFlowInfoOnConfigResult => {
    const config = catalogConfigMap.get(catalogId);

    return okAsync(config?.approvalFlows.map((approvalFlow) => ({ ...approvalFlow, catalogId: catalogId })) ?? []);
  };

export function createApprovalFlowConfigProvider(catalogConfigMap: ReadonlyMap<string, Readonly<CatalogConfig>>): ApprovalFlowConfigProvider {
  const approvalFlowConfigProvider: ApprovalFlowConfigProvider = {
    getInfo: getApprovalFlowConfig(catalogConfigMap),
    listInfoByCatalogId: listApprovalFlowConfig(catalogConfigMap),
  };
  return approvalFlowConfigProvider;
}
