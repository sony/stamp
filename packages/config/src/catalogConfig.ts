import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { okAsync } from "neverthrow";
import { GetCatalogConfigResult, CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { some, none } from "@stamp-lib/stamp-option";

export const getCatalogConfig =
  (catalogConfigMap: ReadonlyMap<string, Readonly<CatalogConfig>>) =>
  (id: string): GetCatalogConfigResult => {
    const config = catalogConfigMap.get(id);
    if (config === undefined) {
      return okAsync(none);
    } else {
      return okAsync(some(config));
    }
  };

export function createCatalogConfigProvider(catalogConfigMap: ReadonlyMap<string, Readonly<CatalogConfig>>): CatalogConfigProvider {
  const catalogConfigOnDBWorkflow: CatalogConfigProvider = {
    get: getCatalogConfig(catalogConfigMap),
  };
  return catalogConfigOnDBWorkflow;
}
