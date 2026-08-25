import { Logger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { ListResourceAuditItemOutput } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceAuditItem } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createCheckCanViewResource } from "../../events/resource/visibility/canViewResource";
import { convertPromiseResultToResultAsync, parseZodObject } from "../../utils/neverthrow";
import { ListResourceAuditItemInput } from "./input";

export type ListResourceAuditItemFunc = <T extends ListResourceAuditItemInput>(input: T) => ResultAsync<ListResourceAuditItemOutput, StampHubError>;

export const listResourceAuditItem =
  (
    logger: Logger,
    providers: {
      getCatalogConfigProvider: CatalogConfigProvider["get"];
      getResourceDBProvider: ResourceDBProvider["getById"];
      getCatalogDBProvider: CatalogDBProvider["getById"];
      listGroupMemberShipByUser: GroupMemberShipProvider["listByUser"];
    }
  ): ListResourceAuditItemFunc =>
  (input: ListResourceAuditItemInput) => {
    const { getCatalogConfigProvider, getResourceDBProvider, getCatalogDBProvider, listGroupMemberShipByUser } = providers;
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
    const checkCanViewResource = createCheckCanViewResource({
      getResourceDB: getResourceDBProvider,
      getCatalogDB: getCatalogDBProvider,
      listGroupMemberShipByUser,
    });

    const parsedInputResult = parseZodObject(input, ListResourceAuditItemInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return getCatalogConfig(parsedInput)
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        // visibility: "restricted" resources are only visible to catalog owner / owner / approver / requester / parent owner.
        // The parent is resolved through the catalog handler only when needed.
        return getResourceDBProvider({ id: extendInput.resourceId, catalogId: extendInput.catalogId, resourceTypeId: extendInput.resourceTypeId })
          .mapErr(convertStampHubError)
          .andThen((resourceOnDB) =>
            checkCanViewResource({
              requestUserId: extendInput.requestUserId,
              catalogId: extendInput.catalogId,
              resourceOnDB,
              resolveParent: () => {
                const parentResourceTypeId = extendInput.resourceTypeConfig.parentResourceTypeId;
                if (parentResourceTypeId === undefined) {
                  return okAsync(none);
                }
                return convertPromiseResultToResultAsync()(
                  extendInput.resourceTypeConfig.handlers.getResource({ resourceTypeId: extendInput.resourceTypeId, resourceId: extendInput.resourceId })
                ).map((resource) =>
                  resource.isSome() && resource.value.parentResourceId !== undefined
                    ? some({ resourceTypeId: parentResourceTypeId, resourceId: resource.value.parentResourceId })
                    : none
                );
              },
            })
          )
          .map(() => extendInput);
      })
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
