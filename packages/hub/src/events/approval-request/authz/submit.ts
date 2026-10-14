import { Option, none, some } from "@stamp-lib/stamp-option";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../../error";
import { SubmitApprovalRequestInput } from "../../../inputAuthzModel";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { createIsUserInGroup } from "../../group/membership";
import { createIsRequesterOfResource } from "../../resource/requester/isRequesterOfResource";
import { ResourceRef, inputResourcesOfApprovalRequest } from "../resources";

export type FindResourceNotRequestableBy = (userId: UserId, resources: Array<ResourceRef>) => ResultAsync<Option<ResourceRef>, StampHubError>;

/**
 * Returns the first resource (in order) whose `requesterGroupIds` does not include the user, or none.
 */
export function createFindResourceNotRequestableBy(
  getResourceById: ResourceDBProvider["getById"],
  getGroupMemberShip: GroupMemberShipProvider["get"]
): FindResourceNotRequestableBy {
  const isRequesterOfResource = createIsRequesterOfResource(createIsUserInGroup(getGroupMemberShip));
  return (userId, resources) => {
    if (resources.length === 0) {
      return okAsync(none);
    }
    return ResultAsync.combine(
      resources.map((ref) =>
        getResourceById({ id: ref.resourceId, catalogId: ref.catalogId, resourceTypeId: ref.resourceTypeId })
          .mapErr(convertStampHubError)
          .andThen((resourceOnDB) => isRequesterOfResource({ requestUserId: userId, resourceOnDB }))
          .map((isRequester) => ({ ref, isRequester }))
      )
    ).map((results) => {
      const notRequestable = results.find((result) => !result.isRequester);
      return notRequestable === undefined ? none : some(notRequestable.ref);
    });
  };
}

export type CheckCanSubmitRequestForResources = <T extends SubmitApprovalRequestInput>(input: T) => ResultAsync<T, StampHubError>;

/**
 * Submit authorization: the requester must be a member of `requesterGroupIds` of every input resource that has it set.
 * Owners / approvers get no bypass. Visibility is a separate concern and is not checked here.
 */
export function checkCanSubmitRequestForResources(
  getResourceById: ResourceDBProvider["getById"],
  getGroupMemberShip: GroupMemberShipProvider["get"]
): CheckCanSubmitRequestForResources {
  const findResourceNotRequestableBy = createFindResourceNotRequestableBy(getResourceById, getGroupMemberShip);
  return (input) =>
    parseZodObjectAsync(input, SubmitApprovalRequestInput)
      .andThen((parsedInput) => findResourceNotRequestableBy(parsedInput.requestUserId, inputResourcesOfApprovalRequest(parsedInput)))
      .andThen((notRequestable) => {
        if (notRequestable.isNone()) {
          return okAsync(input);
        }
        const ref = notRequestable.value;
        return errAsync(
          new StampHubError(
            `User ${input.requestUserId} is not in requesterGroupIds of resource ${ref.resourceTypeId}/${ref.resourceId}`,
            "You are not allowed to submit a request for this resource",
            "FORBIDDEN"
          )
        );
      })
      .mapErr(convertStampHubError);
}
