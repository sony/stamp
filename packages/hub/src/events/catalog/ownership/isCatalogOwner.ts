import { CatalogDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ResultAsync, okAsync } from "neverthrow";
import { IsUserInGroup } from "../../group/membership";
import { StampHubError, convertStampHubError } from "../../../error";

export type IsCatalogOwner = (input: { requestUserId: string; catalogId: string }) => ResultAsync<boolean, StampHubError>;

function isCatalogOwnerImpl(
  input: { requestUserId: string; catalogId: string },
  getCatalogDB: CatalogDBProvider["getById"],
  isUserInGroup: IsUserInGroup
): ResultAsync<boolean, StampHubError> {
  return getCatalogDB(input.catalogId)
    .andThen((catalogDB) => {
      if (catalogDB.isSome() && catalogDB.value.ownerGroupId) {
        return isUserInGroup({ groupId: catalogDB.value.ownerGroupId, userId: input.requestUserId });
      }
      return okAsync(false);
    })
    .mapErr(convertStampHubError);
}
export function createIsCatalogOwner(getCatalogDB: CatalogDBProvider["getById"], isUserInGroup: IsUserInGroup): IsCatalogOwner {
  return (input) => isCatalogOwnerImpl(input, getCatalogDB, isUserInGroup);
}
