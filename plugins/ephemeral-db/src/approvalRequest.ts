import { ApprovalRequestDBProvider, RequestDateQuery } from "@stamp-lib/stamp-types/pluginInterface/database";
import { errAsync, okAsync } from "neverthrow";
import {
  ApprovalFlowId,
  ApprovalRequest,
  ApprovedRequest,
  ApprovedActionFailedRequest,
  CatalogId,
  RejectedRequest,
  RevokedRequest,
  RevokedActionFailedRequest,
  SubmittedRequest,
  ValidationFailedRequest,
  PendingRequest,
  ApprovedActionSucceededRequest,
  RevokedActionSucceededRequest,
} from "@stamp-lib/stamp-types/models";
import { UpdateStatusToApprovedInput, UpdateStatusToRejectedInput, UpdateStatusToRevokedInput, DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { some, none } from "@stamp-lib/stamp-option";
import { Logger } from "@stamp-lib/stamp-logger";

const approvalRequestMap = new Map<string, ApprovalRequest>();
export function createApprovalRequestDBProvider(logger: Logger): ApprovalRequestDBProvider {
  return {
    getById: (id: string) => {
      logger.info("ApprovalRequestDB.getById", id);
      const approvalRequest = structuredClone(approvalRequestMap.get(id));
      if (approvalRequest === undefined) {
        return okAsync(none);
      } else {
        return okAsync(some(approvalRequest));
      }
    },
    listByApprovalFlowId: (input: { catalogId: CatalogId; approvalFlowId: ApprovalFlowId; requestDate?: RequestDateQuery }) => {
      logger.info("ApprovalRequestDB.list");
      const approvalRequests = structuredClone(Array.from(approvalRequestMap.values()));

      const filteredItems = approvalRequests.filter((item) => {
        if (input.catalogId && item.catalogId !== input.catalogId) {
          return false;
        }
        if (input.approvalFlowId && item.approvalFlowId !== input.approvalFlowId) {
          return false;
        }
        // Filter by requestDate
        if (input.requestDate && !(input.requestDate.start <= item.requestDate && item.requestDate <= input.requestDate.end)) {
          return false;
        }

        return true;
      });

      return okAsync({ items: filteredItems });
    },
    listByApproverId: (input: { approverId: string; requestDate?: RequestDateQuery }) => {
      logger.info("ApprovalRequestDB.list");
      const approvalRequests = structuredClone(Array.from(approvalRequestMap.values()));

      const filteredItems = approvalRequests.filter((item) => {
        if (input.approverId && item.approverId !== input.approverId) {
          return false;
        }
        // Filter by requestDate
        if (input.requestDate && !(input.requestDate.start <= item.requestDate && item.requestDate <= input.requestDate.end)) {
          return false;
        }

        return true;
      });

      return okAsync({ items: filteredItems });
    },
    listByRequestUserId: (input: { requestUserId: string; requestDate?: RequestDateQuery }) => {
      logger.info("ApprovalRequestDB.list");
      const approvalRequests = structuredClone(Array.from(approvalRequestMap.values()));

      const filteredItems = approvalRequests.filter((item) => {
        if (input.requestUserId && item.requestUserId !== input.requestUserId) {
          return false;
        }

        // Filter by requestDate
        if (input.requestDate && !(input.requestDate.start <= item.requestDate && item.requestDate <= input.requestDate.end)) {
          return false;
        }

        return true;
      });

      return okAsync({ items: filteredItems });
    },
    set: <
      T extends
        | SubmittedRequest
        | ValidationFailedRequest
        | PendingRequest
        | ApprovedRequest
        | ApprovedActionSucceededRequest
        | ApprovedActionFailedRequest
        | RejectedRequest
        | RevokedRequest
        | RevokedActionSucceededRequest
        | RevokedActionFailedRequest
    >(
      approvalRequest: T
    ) => {
      logger.info("ApprovalRequestDB.set");
      approvalRequestMap.set(approvalRequest.requestId, structuredClone(approvalRequest));
      return okAsync(structuredClone(approvalRequest));
    },
    updateStatusToApproved: (input: UpdateStatusToApprovedInput) => {
      const id = input.requestId;
      logger.info("ApprovalRequestDB.updateStatusToApproved", id);
      const request = approvalRequestMap.get(id);
      if (request?.status === "pending") {
        const approvedRequest: ApprovedRequest = {
          ...request,
          status: "approved",
          approvedDate: input.approvedDate,
          userIdWhoApproved: input.userIdWhoApproved,
          approvedComment: input.approvedComment,
        };

        approvalRequestMap.set(id, structuredClone(approvedRequest));
        return okAsync(structuredClone(approvedRequest));
      }
      return errAsync(new DBError("Request is not in pending status"));
    },
    updateStatusToRejected: (input: UpdateStatusToRejectedInput) => {
      const id = input.requestId;
      logger.info("ApprovalRequestDB.updateStatusToRejected", id);
      const request = approvalRequestMap.get(id);
      if (request?.status === "pending") {
        const rejectedRequest: RejectedRequest = {
          ...request,
          status: "rejected",
          rejectedDate: input.rejectedDate,
          userIdWhoRejected: input.userIdWhoRejected,
          rejectComment: input.rejectComment,
        };

        approvalRequestMap.set(id, structuredClone(rejectedRequest));
        return okAsync(structuredClone(rejectedRequest));
      }
      return errAsync(new DBError("Request is not in pending status"));
    },
    updateStatusToRevoked: (input: UpdateStatusToRevokedInput) => {
      const id = input.requestId;
      logger.info("ApprovalRequestDB.updateStatusToRevoked", id);
      const request = approvalRequestMap.get(id);
      if (request?.status === "approvedActionSucceeded") {
        const revokedRequest: RevokedRequest = {
          ...request,
          status: "revoked",
          revokedDate: input.revokedDate,
          userIdWhoRevoked: input.userIdWhoRevoked,
          revokedComment: input.revokedComment,
        };

        approvalRequestMap.set(id, structuredClone(revokedRequest));
        return okAsync(structuredClone(revokedRequest));
      }
      return errAsync(new DBError("Request is not in approved status"));
    },
  };
}
