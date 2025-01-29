import { CatalogDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { okAsync } from "neverthrow";
import { CatalogInfoOnDB } from "@stamp-lib/stamp-types/models";
import { some, none } from "@stamp-lib/stamp-option";
import { Logger } from "@stamp-lib/stamp-logger";

const catalogMap = new Map<string, CatalogInfoOnDB>();
export function createCatalogDBProvider(logger: Logger): CatalogDBProvider {
  return {
    getById: (id: string) => {
      logger.info("CatalogDB.getById", id);
      const catalog = structuredClone(catalogMap.get(id));
      if (catalog === undefined) {
        return okAsync(none);
      } else {
        return okAsync(some(catalog));
      }
    },
    listAll: () => {
      logger.info("CatalogDB.listAll");
      const catalogs = structuredClone(Array.from(catalogMap.values()));
      return okAsync(catalogs);
    },
    set: (catalog: CatalogInfoOnDB) => {
      logger.info("CatalogDB.set");
      catalogMap.set(catalog.id, structuredClone(catalog));
      return okAsync(structuredClone(catalog));
    },
    delete: (id: string) => {
      logger.info("CatalogDB.delete", id);
      catalogMap.delete(id);
      return okAsync(undefined);
    },
  };
}
