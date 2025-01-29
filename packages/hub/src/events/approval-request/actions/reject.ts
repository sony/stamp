import { RejectedRequest } from "@stamp-lib/stamp-types/models";

import { convertStampHubError, StampHubError } from "../../../error";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";

import { z } from "zod";
import { ResultAsync } from "neverthrow";
import { parseZodObjectAsync } from "../../../utils/neverthrow";

export const RejectApprovalRequestInput = RejectedRequest.pick({
  catalogId: true,
  approvalFlowId: true,
  requestId: true,
  userIdWhoRejected: true,
  rejectComment: true,
});
export type RejectApprovalRequestInput = z.infer<typeof RejectApprovalRequestInput>;

export function createRejectApprovalRequest(updateStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"]) {
  return (input: RejectApprovalRequestInput) => rejectApprovalRequestImpl(input, updateStatusToRejected);
}

export function rejectApprovalRequestImpl(
  input: RejectApprovalRequestInput,
  updateStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"]
): ResultAsync<RejectedRequest, StampHubError> {
  return parseZodObjectAsync(input, RejectApprovalRequestInput)
    .andThen((parsedInput) => {
      return updateStatusToRejected({
        catalogId: parsedInput.catalogId,
        approvalFlowId: parsedInput.approvalFlowId,
        requestId: parsedInput.requestId,
        userIdWhoRejected: parsedInput.userIdWhoRejected,
        rejectedDate: new Date().toISOString(),
        rejectComment: parsedInput.rejectComment,
      });
    })
    .mapErr(convertStampHubError);
}
