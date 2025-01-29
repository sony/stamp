import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { CatalogId, CatalogConfig } from "@stamp-lib/stamp-types/models";

export const GetCatalogConfigInput = z.object({
  catalogId: CatalogId,
});
export type GetCatalogConfigInput = z.infer<typeof GetCatalogConfigInput>;

export type GetCatalogConfig = <T extends GetCatalogConfigInput>(input: T) => ResultAsync<T & { catalogConfig: CatalogConfig }, StampHubError>;

export function getCatalogConfigImpl<T extends GetCatalogConfigInput>(
  input: T,
  getCatalogConfigProvider: CatalogConfigProvider["get"]
): ResultAsync<T & { catalogConfig: CatalogConfig }, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, GetCatalogConfigInput)
    .andThen((parsedInput) => {
      return getCatalogConfigProvider(parsedInput.catalogId);
    })
    .andThen((catalogOption) => {
      // Check if exist
      if (catalogOption.isNone()) {
        return errAsync(new StampHubError("Catalog not found", "Catalog Not Found", "BAD_REQUEST"));
      } else {
        return okAsync({ ...input, catalogConfig: catalogOption.value });
      }
    })
    .mapErr(convertStampHubError);
}

export const createGetCatalogConfig = (getCatalogConfigProvider: CatalogConfigProvider["get"]): GetCatalogConfig => {
  return (input) => getCatalogConfigImpl(input, getCatalogConfigProvider);
};
