import { ApprovalRequest } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupId, GroupMemberShipProvider, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { StampHubError } from "../../../error";
import { createIsCatalogOwner } from "../../catalog/ownership/isCatalogOwner";
import { createIsUserInGroupFromSet, createListAllGroupIdsByUser } from "../../group/membership";

export type ApprovalRequestViewer = {
  /** Every group id the viewer belongs to. */
  userGroupIds: ReadonlySet<GroupId>;
  /** Whether the viewer owns the catalog the request belongs to. */
  isCatalogOwner: boolean;
};

export type ApprovalRequestForVisibility = Pick<ApprovalRequest, "requestUserId" | "approverType" | "approverId" | "visibility">;

/**
 * Pure visibility rule for approval requests.
 * A request without a visibility snapshot is visible to everyone.
 * A request with `visibility.type === "restricted"` is visible to the requester, members of the approver group,
 * the catalog owner, and members of any group in the snapshot's `viewerGroupIds`.
 * The snapshot is fixed at submit time, so later resource changes / deletion do not affect it.
 */
export function isApprovalRequestVisibleTo(input: { request: ApprovalRequestForVisibility; requestUserId: UserId; viewer: ApprovalRequestViewer }): boolean {
  const { request, requestUserId, viewer } = input;
  if (request.visibility === undefined) {
    return true;
  }
  if (request.requestUserId === requestUserId) {
    return true;
  }
  if (request.approverType === "group" && viewer.userGroupIds.has(request.approverId)) {
    return true;
  }
  if (viewer.isCatalogOwner) {
    return true;
  }
  return request.visibility.viewerGroupIds.some((groupId) => viewer.userGroupIds.has(groupId));
}

export type ApprovalRequestVisibilityDeps = {
  getCatalogDB: CatalogDBProvider["getById"];
  listGroupMemberShipByUser: GroupMemberShipProvider["listByUser"];
};

/**
 * Resolve the viewer's group set and catalog ownership with a constant number of lookups.
 */
export function createResolveApprovalRequestViewer(deps: ApprovalRequestVisibilityDeps) {
  const listAllGroupIdsByUser = createListAllGroupIdsByUser(deps.listGroupMemberShipByUser);
  return (input: { requestUserId: UserId; catalogId: string }): ResultAsync<ApprovalRequestViewer, StampHubError> =>
    listAllGroupIdsByUser(input.requestUserId).andThen((userGroupIds) =>
      createIsCatalogOwner(deps.getCatalogDB, createIsUserInGroupFromSet(userGroupIds))(input).map((isCatalogOwner) => ({ userGroupIds, isCatalogOwner }))
    );
}

export type CheckCanViewApprovalRequest = <T extends ApprovalRequestForVisibility & { catalogId: string }>(input: {
  request: T;
  requestUserId: UserId;
}) => ResultAsync<T, StampHubError>;

/**
 * Single-request visibility check (approvalRequest.get). Returns FORBIDDEN when not visible.
 * Requests without a snapshot short-circuit without any identity / catalog lookup.
 */
export function createCheckCanViewApprovalRequest(deps: ApprovalRequestVisibilityDeps): CheckCanViewApprovalRequest {
  const resolveViewer = createResolveApprovalRequestViewer(deps);
  return ({ request, requestUserId }) => {
    if (request.visibility === undefined || request.requestUserId === requestUserId) {
      return okAsync(request);
    }
    return resolveViewer({ requestUserId, catalogId: request.catalogId }).andThen((viewer) => {
      if (isApprovalRequestVisibleTo({ request, requestUserId, viewer })) {
        return okAsync(request);
      }
      return errAsync(new StampHubError("Permission denied", "Permission Denied", "FORBIDDEN"));
    });
  };
}

/**
 * Filter a page of approval requests of one catalog for the viewer.
 * Identity / catalog lookups happen once per page and only if some request carries a visibility snapshot.
 */
export function createFilterVisibleApprovalRequests(deps: ApprovalRequestVisibilityDeps) {
  const resolveViewer = createResolveApprovalRequestViewer(deps);
  return <T extends ApprovalRequestForVisibility>(input: { requests: Array<T>; requestUserId: UserId; catalogId: string }): ResultAsync<Array<T>, StampHubError> => {
    const { requests, requestUserId, catalogId } = input;
    const needsCheck = requests.some((request) => request.visibility !== undefined && request.requestUserId !== requestUserId);
    if (!needsCheck) {
      return okAsync(requests);
    }
    return resolveViewer({ requestUserId, catalogId }).map((viewer) => requests.filter((request) => isApprovalRequestVisibleTo({ request, requestUserId, viewer })));
  };
}
