import { StampHubError, convertStampHubError } from "../../error";
import { ApprovalRequestDBProvider, CatalogDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { z } from "zod";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync, okAsync } from "neverthrow";
import { GroupMemberShipProvider, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";

import { ApprovalRequest } from "@stamp-lib/stamp-types/models";

import { Option, none, some } from "@stamp-lib/stamp-option";
import { createCheckCanViewApprovalRequest } from "../../events/approval-request/visibility/canViewApprovalRequest";
export const GetApprovalRequestInput = z.object({
  approvalRequestId: z.string(),
  requestUserId: UserId,
});
export type GetApprovalRequestInput = z.infer<typeof GetApprovalRequestInput>;

/**
 * Get an approval request for the request user.
 * Requests that carry a visibility snapshot (restricted resources) are only returned to the requester,
 * the approver group, the catalog owner and the snapshot's viewer groups; FORBIDDEN otherwise.
 */
export function GetApprovalRequestWorkflow(
  input: GetApprovalRequestInput,
  approvalRequestDBProvider: ApprovalRequestDBProvider,
  providers: {
    getCatalogDBProvider: CatalogDBProvider["getById"];
    listGroupMemberShipByUser: GroupMemberShipProvider["listByUser"];
  }
): ResultAsync<Option<ApprovalRequest>, StampHubError> {
  const checkCanViewApprovalRequest = createCheckCanViewApprovalRequest({
    getCatalogDB: providers.getCatalogDBProvider,
    listGroupMemberShipByUser: providers.listGroupMemberShipByUser,
  });
  return parseZodObjectAsync(input, GetApprovalRequestInput)
    .andThen((parsedInput) => {
      return approvalRequestDBProvider.getById(parsedInput.approvalRequestId).andThen((approvalRequest) => {
        if (approvalRequest.isNone()) {
          return okAsync(none);
        }
        return checkCanViewApprovalRequest({ request: approvalRequest.value, requestUserId: parsedInput.requestUserId }).map((request) => some(request));
      });
    })
    .mapErr(convertStampHubError);
}
