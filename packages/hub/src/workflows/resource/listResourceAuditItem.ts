import { Logger } from "@stamp-lib/stamp-logger";
import { ListResourceAuditItemOutput } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceAuditItem } from "@stamp-lib/stamp-types/models";
import { ResultAsync, errAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { convertPromiseResultToResultAsync, parseZodObject } from "../../utils/neverthrow";
import { ListResourceAuditItemInput } from "./input";

export type ListResourceAuditItemFunc = <T extends ListResourceAuditItemInput>(input: T) => ResultAsync<ListResourceAuditItemOutput, StampHubError>;

export const listResourceAuditItem =
  (logger: Logger, getCatalogConfigProvider: CatalogConfigProvider["get"]): ListResourceAuditItemFunc =>
  (input: ListResourceAuditItemInput) => {
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);

    const parsedInputResult = parseZodObject(input, ListResourceAuditItemInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return getCatalogConfig(parsedInput)
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        return convertPromiseResultToResultAsync()(
          extendInput.resourceTypeConfig.handlers.listResourceAuditItem({
            resourceTypeId: extendInput.resourceTypeId,
            resourceId: extendInput.resourceId,
            paginationToken: extendInput.paginationToken,
            limit: extendInput.limit,
          })
        );
      })
      .map((listResourceResult) => {
        const resourceAuditItem: Array<ResourceAuditItem> = listResourceResult.auditItems.map((resource) => {
          return {
            values: resource.values,
            type: resource.type,
            name: resource.name,
          };
        });
        return {
          auditItems: resourceAuditItem,
          paginationToken: listResourceResult.paginationToken,
        };
      })
      .mapErr(convertStampHubError);
  };
