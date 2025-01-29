import { CatalogInfo } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { CatalogInfoOnConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResultAsync } from "neverthrow";
import { Option, none, some } from "@stamp-lib/stamp-option";
import { StampHubError, convertStampHubError } from "../../error";

export type GetCatalogInfoResult = (id: string) => ResultAsync<Option<CatalogInfo>, StampHubError>;

export const getCatalogInfo =
  (getCatalogInfoFromDB: CatalogDBProvider["getById"], getCatalogInfoFromConfig: CatalogInfoOnConfigProvider["get"]): GetCatalogInfoResult =>
  (id) => {
    return ResultAsync.combine([getCatalogInfoFromDB(id), getCatalogInfoFromConfig(id)])
      .map(([catalogInfoOnDB, catalogInfoOnConfig]) => {
        if (catalogInfoOnConfig.isNone()) {
          return none;
        }
        if (catalogInfoOnDB.isNone()) {
          return some({ ...catalogInfoOnConfig.value });
        }
        return some({ ...catalogInfoOnDB.value, ...catalogInfoOnConfig.value });
      })
      .mapErr(convertStampHubError);
  };
