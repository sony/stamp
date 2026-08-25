import { Option, none, some } from "@stamp-lib/stamp-option";
import { CatalogId, ResourceId, ResourceOnDB, ResourceTypeId } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupId, GroupMemberShipProvider, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../../error";
import { createIsCatalogOwner } from "../../catalog/ownership/isCatalogOwner";
import { createIsUserInGroupFromSet, createListAllGroupIdsByUser } from "../../group/membership";
import { createListAllResourceOnDBByType } from "../info/listAllResourceOnDBByType";

export type ResourceVisibilityViewer = {
  /** Every group id the viewer belongs to. */
  userGroupIds: ReadonlySet<GroupId>;
  /** Whether the viewer is an owner of the catalog the resource belongs to. */
  isCatalogOwner: boolean;
};

/**
 * Whether a resource is restricted (needs a visibility check at all).
 */
export function isRestrictedResource(resourceOnDB: Option<Pick<ResourceOnDB, "visibility">>): boolean {
  return resourceOnDB.isSome() && resourceOnDB.value.visibility === "restricted";
}

/**
 * Pure visibility rule.
 * - No DB row or visibility !== "restricted": visible to everyone.
 * - restricted: visible to the catalog owner, members of ownerGroupId / approverGroupId / requesterGroupIds,
 *   and members of the parent resource's ownerGroupId.
 */
export function isResourceVisibleTo(input: {
  resourceOnDB: Option<ResourceOnDB>;
  parentOwnerGroupId?: GroupId;
  viewer: ResourceVisibilityViewer;
}): boolean {
  const { resourceOnDB, parentOwnerGroupId, viewer } = input;
  if (!isRestrictedResource(resourceOnDB) || resourceOnDB.isNone()) {
    return true;
  }
  if (viewer.isCatalogOwner) {
    return true;
  }
  const resource = resourceOnDB.value;
  if (resource.ownerGroupId && viewer.userGroupIds.has(resource.ownerGroupId)) {
    return true;
  }
  if (resource.approverGroupId && viewer.userGroupIds.has(resource.approverGroupId)) {
    return true;
  }
  if (resource.requesterGroupIds?.some((groupId) => viewer.userGroupIds.has(groupId))) {
    return true;
  }
  if (parentOwnerGroupId && viewer.userGroupIds.has(parentOwnerGroupId)) {
    return true;
  }
  return false;
}

export type ResourceVisibilityDeps = {
  getCatalogDB: CatalogDBProvider["getById"];
  listGroupMemberShipByUser: GroupMemberShipProvider["listByUser"];
};

/**
 * Resolve the viewer's group set and catalog ownership with a constant number of lookups.
 */
export function createResolveResourceVisibilityViewer(deps: ResourceVisibilityDeps) {
  const listAllGroupIdsByUser = createListAllGroupIdsByUser(deps.listGroupMemberShipByUser);
  return (input: { requestUserId: UserId; catalogId: CatalogId }): ResultAsync<ResourceVisibilityViewer, StampHubError> =>
    listAllGroupIdsByUser(input.requestUserId).andThen((userGroupIds) =>
      createIsCatalogOwner(deps.getCatalogDB, createIsUserInGroupFromSet(userGroupIds))(input).map((isCatalogOwner) => ({ userGroupIds, isCatalogOwner }))
    );
}

export type ParentResourceKey = { resourceTypeId: ResourceTypeId; resourceId: ResourceId };

export type CheckCanViewResourceInput = {
  requestUserId: UserId;
  catalogId: CatalogId;
  resourceOnDB: Option<ResourceOnDB>;
  /**
   * Resolves the parent resource key. Called only when the resource is restricted and no other rule matched,
   * so callers may back it with a catalog handler call.
   */
  resolveParent?: () => ResultAsync<Option<ParentResourceKey>, StampHubError>;
};
export type CheckCanViewResource = (input: CheckCanViewResourceInput) => ResultAsync<void, StampHubError>;

const permissionDenied = () => new StampHubError("Permission denied", "Permission Denied", "FORBIDDEN");

/**
 * Single-resource visibility check (resource.get / resource.listAuditItem). Returns FORBIDDEN when not visible.
 * Unrestricted resources short-circuit without any identity / catalog lookup.
 */
export function createCheckCanViewResource(deps: ResourceVisibilityDeps & { getResourceDB: ResourceDBProvider["getById"] }): CheckCanViewResource {
  const resolveViewer = createResolveResourceVisibilityViewer(deps);
  return (input) => {
    if (!isRestrictedResource(input.resourceOnDB)) {
      return okAsync(undefined);
    }
    return resolveViewer({ requestUserId: input.requestUserId, catalogId: input.catalogId }).andThen((viewer) => {
      if (isResourceVisibleTo({ resourceOnDB: input.resourceOnDB, viewer })) {
        return okAsync(undefined);
      }
      if (!input.resolveParent) {
        return errAsync(permissionDenied());
      }
      return input.resolveParent().andThen((parentKey) => {
        if (parentKey.isNone()) {
          return errAsync(permissionDenied());
        }
        return deps
          .getResourceDB({ id: parentKey.value.resourceId, catalogId: input.catalogId, resourceTypeId: parentKey.value.resourceTypeId })
          .mapErr(convertStampHubError)
          .andThen((parentOnDB) => {
            const parentOwnerGroupId = parentOnDB.isSome() ? parentOnDB.value.ownerGroupId : undefined;
            if (isResourceVisibleTo({ resourceOnDB: input.resourceOnDB, parentOwnerGroupId, viewer })) {
              return okAsync(undefined);
            }
            return errAsync(permissionDenied());
          });
      });
    });
  };
}

export type ResourceVisibilityFilter = (item: { id: ResourceId; parentResourceId?: ResourceId }) => boolean;

/**
 * Build a synchronous visibility filter for a whole list page of one resource type with a constant number of reads:
 * 1 Query for the type's rows (+1 for the parent type), and identity / catalog lookups only if some row is restricted.
 */
export function createPrepareResourceVisibilityFilter(deps: ResourceVisibilityDeps & { listResourceByResourceType: ResourceDBProvider["listByResourceType"] }) {
  const listAllResourceOnDBByType = createListAllResourceOnDBByType(deps.listResourceByResourceType);
  const resolveViewer = createResolveResourceVisibilityViewer(deps);
  const showAll: ResourceVisibilityFilter = () => true;

  return (input: {
    requestUserId: UserId;
    catalogId: CatalogId;
    resourceTypeId: ResourceTypeId;
    parentResourceTypeId?: ResourceTypeId;
  }): ResultAsync<ResourceVisibilityFilter, StampHubError> => {
    return listAllResourceOnDBByType({ catalogId: input.catalogId, resourceTypeId: input.resourceTypeId }).andThen((rows) => {
      const hasRestricted = Array.from(rows.values()).some((row) => row.visibility === "restricted");
      if (!hasRestricted) {
        return okAsync(showAll);
      }
      return resolveViewer({ requestUserId: input.requestUserId, catalogId: input.catalogId }).andThen((viewer) => {
        if (viewer.isCatalogOwner) {
          return okAsync(showAll);
        }
        const parentRows =
          input.parentResourceTypeId !== undefined
            ? listAllResourceOnDBByType({ catalogId: input.catalogId, resourceTypeId: input.parentResourceTypeId })
            : okAsync(new Map<ResourceId, ResourceOnDB>());
        return parentRows.map((parents): ResourceVisibilityFilter => {
          return (item) => {
            const row = rows.get(item.id);
            const parentOwnerGroupId = item.parentResourceId !== undefined ? parents.get(item.parentResourceId)?.ownerGroupId : undefined;
            return isResourceVisibleTo({ resourceOnDB: row === undefined ? none : some(row), parentOwnerGroupId, viewer });
          };
        });
      });
    });
  };
}
