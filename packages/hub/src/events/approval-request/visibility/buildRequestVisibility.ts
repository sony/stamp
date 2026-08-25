import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ApprovalRequestVisibility, ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../../error";
import { convertPromiseResultToResultAsync } from "../../../utils/neverthrow";
import { createGetCatalogConfig } from "../../catalog/catalogConfig";
import { getResourceTypeConfig } from "../../resource-type/resourceTypeConfig";
import { ApprovalRequestResourcesSource, ResourceRef, resourcesOfApprovalRequest } from "../resources";

export type BuildRequestVisibility = (request: ApprovalRequestResourcesSource) => ResultAsync<ApprovalRequestVisibility | undefined, StampHubError>;

/**
 * Compute the visibility snapshot stored on an approval request at submit time.
 * If any referenced resource is restricted, the snapshot lists every group that may view it:
 * owner / approver / requester groups of those resources plus their parent resource's owner group.
 * Returns undefined when no referenced resource is restricted.
 */
export function createBuildRequestVisibility(deps: {
  getResourceById: ResourceDBProvider["getById"];
  getCatalogConfigProvider: CatalogConfigProvider["get"];
}): BuildRequestVisibility {
  const getCatalogConfig = createGetCatalogConfig(deps.getCatalogConfigProvider);

  const resolveParentOwnerGroupId = (ref: ResourceRef): ResultAsync<GroupId | undefined, StampHubError> =>
    getCatalogConfig({ catalogId: ref.catalogId, resourceTypeId: ref.resourceTypeId })
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        const parentResourceTypeId = extendInput.resourceTypeConfig.parentResourceTypeId;
        if (parentResourceTypeId === undefined) {
          return okAsync(undefined);
        }
        return convertPromiseResultToResultAsync()(
          extendInput.resourceTypeConfig.handlers.getResource({ resourceTypeId: ref.resourceTypeId, resourceId: ref.resourceId })
        ).andThen((resource) => {
          if (resource.isNone() || resource.value.parentResourceId === undefined) {
            return okAsync(undefined);
          }
          return deps
            .getResourceById({ id: resource.value.parentResourceId, catalogId: ref.catalogId, resourceTypeId: parentResourceTypeId })
            .mapErr(convertStampHubError)
            .map((parent) => (parent.isSome() ? parent.value.ownerGroupId : undefined));
        });
      })
      .mapErr(convertStampHubError);

  return (request) => {
    const refs = resourcesOfApprovalRequest(request);
    if (refs.length === 0) {
      return okAsync(undefined);
    }
    return ResultAsync.combine(
      refs.map((ref) =>
        deps
          .getResourceById({ id: ref.resourceId, catalogId: ref.catalogId, resourceTypeId: ref.resourceTypeId })
          .mapErr(convertStampHubError)
          .map((resourceOnDB) => ({ ref, resourceOnDB }))
      )
    ).andThen((rows) => {
      const restricted = rows.flatMap(({ ref, resourceOnDB }) =>
        resourceOnDB.isSome() && resourceOnDB.value.visibility === "restricted" ? [{ ref, resource: resourceOnDB.value as ResourceOnDB }] : []
      );
      if (restricted.length === 0) {
        return okAsync(undefined);
      }
      const viewerGroupIds = new Set<GroupId>();
      restricted.forEach(({ resource }) => {
        if (resource.ownerGroupId) viewerGroupIds.add(resource.ownerGroupId);
        if (resource.approverGroupId) viewerGroupIds.add(resource.approverGroupId);
        resource.requesterGroupIds?.forEach((groupId) => viewerGroupIds.add(groupId));
      });
      return ResultAsync.combine(restricted.map(({ ref }) => resolveParentOwnerGroupId(ref))).map((parentOwnerGroupIds) => {
        parentOwnerGroupIds.forEach((groupId) => {
          if (groupId) viewerGroupIds.add(groupId);
        });
        const visibility: ApprovalRequestVisibility = { type: "restricted", viewerGroupIds: Array.from(viewerGroupIds) };
        return visibility;
      });
    });
  };
}
