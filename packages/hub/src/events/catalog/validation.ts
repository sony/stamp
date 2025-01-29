import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { CatalogId } from "@stamp-lib/stamp-types/models";

export const validateCatalogIdInput = z.object({
  catalogId: CatalogId,
});

export type ValidateCatalogIdInput = z.infer<typeof validateCatalogIdInput>;

export type ValidateCatalogId = <T extends ValidateCatalogIdInput>(input: T) => ResultAsync<T, StampHubError>;

export function validateCatalogIdImpl<T extends ValidateCatalogIdInput>(
  input: T,
  getCatalogConfigProvider: CatalogConfigProvider["get"]
): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, validateCatalogIdInput)
    .andThen((parsedInput) => {
      return getCatalogConfigProvider(parsedInput.catalogId);
    })
    .andThen((catalogOption) => {
      // Check if exist
      if (catalogOption.isNone()) {
        return errAsync(new StampHubError("Catalog not found", "Catalog Not Found", "NOT_FOUND"));
      } else {
        return okAsync(input);
      }
    })
    .mapErr(convertStampHubError);
}

export const createValidateCatalogId = (getCatalogConfigProvider: CatalogConfigProvider["get"]): ValidateCatalogId => {
  return (input) => validateCatalogIdImpl(input, getCatalogConfigProvider);
};
