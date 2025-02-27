import { Logger } from "@stamp-lib/stamp-logger";

import { SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";

import { RevokeWorkflow } from "../approval-request/revoke";

export interface AutoRevokeEventHandlerContext {
  revokeWorkflow: RevokeWorkflow;
  getApprovalRequestDBProvider: ApprovalRequestDBProvider["getById"];
  logger: Logger;
}

export type AutoRevokeEventHandler = (schedulerEvent: SchedulerEvent) => ResultAsync<void, StampHubError>;

export const autoRevokeEventHandler =
  (autoRevokeEventHandlerContext: AutoRevokeEventHandlerContext): AutoRevokeEventHandler =>
  (schedulerEvent: SchedulerEvent) => {
    const logger = autoRevokeEventHandlerContext.logger;
    logger.info("Received autoRevoke schedulerEvent", schedulerEvent);

    const { revokeWorkflow, getApprovalRequestDBProvider } = autoRevokeEventHandlerContext;

    return getApprovalRequestDBProvider(schedulerEvent.property.requestId)
      .andThen((approvalRequest) => {
        if (approvalRequest.isNone()) {
          return errAsync(new StampHubError("Approval request not found", "Approval Request Not Found", "BAD_REQUEST"));
        }
        if (approvalRequest.value.status !== "approvedActionSucceeded") {
          // If the approval request is not in the approvedActionSucceeded state, we don't need to revoke it.
          return okAsync(undefined);
        }
        return revokeWorkflow({
          userIdWhoRevoked: "system",
          revokedComment: "Auto revoke by system",
          approvalRequestId: approvalRequest.value.requestId,
        });
      })
      .mapErr(convertStampHubError)
      .andThen(() => {
        logger.info("Successfully revoked approval request", schedulerEvent.property.requestId);
        return okAsync(undefined);
      });
  };
