import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { okAsync } from "neverthrow";
import { RegisterCatalogConfig, RegisterCatalogConfigResult, RegisterCatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";

export const registerCatalogConfig =
  (catalogConfigMap: Map<string, Readonly<CatalogConfig>>): RegisterCatalogConfig =>
  (catalogConfig: CatalogConfig): RegisterCatalogConfigResult => {
    catalogConfigMap.set(catalogConfig.id, catalogConfig);
    return okAsync(undefined);
  };

export function createRegisterCatalogConfigProvider(catalogConfigMap: Map<string, Readonly<CatalogConfig>>): RegisterCatalogConfigProvider {
  return {
    register: registerCatalogConfig(catalogConfigMap),
  };
}
