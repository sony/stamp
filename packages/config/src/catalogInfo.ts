import { CatalogConfig, CatalogInfoOnConfig } from "@stamp-lib/stamp-types/models";
import { okAsync } from "neverthrow";
import { GetCatalogInfoOnConfigResult, ListCatalogInfoOnConfigResult, CatalogInfoOnConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { some, none } from "@stamp-lib/stamp-option";

export const getCatalogInfoOnConfig =
  (catalogConfigMap: ReadonlyMap<string, Readonly<CatalogConfig>>) =>
  (id: string): GetCatalogInfoOnConfigResult => {
    const config = catalogConfigMap.get(id);
    if (config === undefined) {
      return okAsync(none);
    } else {
      const catalogInfoOnConfig = {
        id: config.id,
        name: config.name,
        description: config.description,
        approvalFlowIds: config.approvalFlows.map((approvalFlow) => approvalFlow.id),
        resourceTypeIds: config.resourceTypes.map((resourceType) => resourceType.id),
      };
      return okAsync(some(catalogInfoOnConfig));
    }
  };

export const listCatalogInfoOnConfig = (catalogConfigMap: ReadonlyMap<string, Readonly<CatalogConfig>>) => (): ListCatalogInfoOnConfigResult => {
  const catalogs = new Array<CatalogInfoOnConfig>();
  for (const [, config] of catalogConfigMap.entries()) {
    const catalogInfoOnConfig = {
      id: config.id,
      name: config.name,
      description: config.description,
      approvalFlowIds: config.approvalFlows.map((approvalFlow) => approvalFlow.id),
      resourceTypeIds: config.resourceTypes.map((resourceType) => resourceType.id),
    };
    catalogs.push(catalogInfoOnConfig);
  }
  return okAsync(catalogs);
};

export function createCatalogInfoOnConfigProvider(catalogConfigMap: ReadonlyMap<string, Readonly<CatalogConfig>>): CatalogInfoOnConfigProvider {
  const catalogInfoOnDBWorkflow: CatalogInfoOnConfigProvider = {
    get: getCatalogInfoOnConfig(catalogConfigMap),
    list: listCatalogInfoOnConfig(catalogConfigMap),
  };
  return catalogInfoOnDBWorkflow;
}
