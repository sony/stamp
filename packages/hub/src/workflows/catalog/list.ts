import { CatalogInfo, CatalogInfoOnDB } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { CatalogInfoOnConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResultAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";

export type ListCatalogInfoResult = () => ResultAsync<Array<CatalogInfo>, StampHubError>;

export const listCatalogInfo =
  (listAllCatalogInfo: CatalogDBProvider["listAll"], listCatalogInfoOnConfig: CatalogInfoOnConfigProvider["list"]): ListCatalogInfoResult =>
  () => {
    return ResultAsync.combine([listAllCatalogInfo(), listCatalogInfoOnConfig()])
      .map(([catalogsInfoOnDb, catalogsInfoOnConfig]) => {
        const catalogsInfo = new Array<CatalogInfo>();
        const catalogsInfoOnDbMap = new Map<string, CatalogInfoOnDB>();
        catalogsInfoOnDb.forEach((catalogInfoOnDb) => {
          catalogsInfoOnDbMap.set(catalogInfoOnDb.id, catalogInfoOnDb);
        });

        for (const catalogInfoOnConfig of catalogsInfoOnConfig) {
          const catalogInfoOnDb = catalogsInfoOnDbMap.get(catalogInfoOnConfig.id);
          if (catalogInfoOnDb === undefined) {
            catalogsInfo.push({ ownerGroupId: undefined, ...catalogInfoOnConfig });
          } else {
            catalogsInfo.push({ ...catalogInfoOnDb, ...catalogInfoOnConfig });
          }
        }
        return catalogsInfo;
      })
      .mapErr(convertStampHubError);
  };
