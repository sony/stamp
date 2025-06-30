import { ApprovalRequestDBProvider, UpdateStatusToCanceledInput } from "@stamp-lib/stamp-types/pluginInterface/database";
import { CanceledRequest } from "@stamp-lib/stamp-types/models";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../../error";
import { parseZodObjectAsync } from "../../../utils/neverthrow";

export const CancelApprovalRequestInput = UpdateStatusToCanceledInput;
export type CancelApprovalRequestInput = UpdateStatusToCanceledInput;
export type CancelApprovalRequestResult = ResultAsync<CanceledRequest, StampHubError>;

export const cancelApprovalRequest =
  (updateStatusToCanceled: ApprovalRequestDBProvider["updateStatusToCanceled"]) =>
  (input: CancelApprovalRequestInput): CancelApprovalRequestResult => {
    return parseZodObjectAsync(input, CancelApprovalRequestInput)
      .andThen((parsedInput) => {
        // Currently, we only allow the system to cancel an approval request.
        if (parsedInput.userIdWhoCanceled === "system") {
          return okAsync(parsedInput);
        } else {
          return errAsync(
            new StampHubError(
              "User ID who canceled must be 'system' for canceling an approval request",
              "Invalid User ID for Canceling Approval Request",
              "BAD_REQUEST"
            )
          );
        }
      })
      .andThen((parsedInput) => {
        return updateStatusToCanceled({
          catalogId: parsedInput.catalogId,
          approvalFlowId: parsedInput.approvalFlowId,
          requestId: parsedInput.requestId,
          canceledDate: parsedInput.canceledDate,
          userIdWhoCanceled: parsedInput.userIdWhoCanceled,
          cancelComment: parsedInput.cancelComment,
        });
      })
      .mapErr(convertStampHubError);
  };
