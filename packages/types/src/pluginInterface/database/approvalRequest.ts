import {
  ApprovalRequest,
  SubmittedRequest,
  ValidationFailedRequest,
  PendingRequest,
  ApprovedRequest,
  RejectedRequest,
  CanceledRequest,
  RevokedRequest,
  CatalogId,
  ApprovalFlowId,
  ApprovedActionSucceededRequest,
  ApprovedActionFailedRequest,
  RevokedActionSucceededRequest,
  RevokedActionFailedRequest,
} from "../../models";
import { z } from "zod";
import { ResultAsync } from "neverthrow";
import { DBError } from "./error";
import { Option } from "@stamp-lib/stamp-option";
import { UserId } from "../identity";

export type ApprovalRequestDBGetByIdResult = ResultAsync<Option<ApprovalRequest>, DBError>;
export type ApprovalRequestDBListResult = ResultAsync<{ items: Array<ApprovalRequest>; paginationToken?: string }, DBError>;
export type ApprovalRequestDBSetResult<
  T extends
    | SubmittedRequest
    | ValidationFailedRequest
    | PendingRequest
    | ApprovedRequest
    | ApprovedActionSucceededRequest
    | ApprovedActionFailedRequest
    | RejectedRequest
    | CanceledRequest
    | RevokedRequest
    | RevokedActionSucceededRequest
    | RevokedActionFailedRequest
> = ResultAsync<T, DBError>;

export const UpdateStatusToApprovedInput = z.object({
  catalogId: CatalogId,
  approvalFlowId: ApprovalFlowId,
  requestId: z.string(),
  approvedDate: z.string().datetime(),
  userIdWhoApproved: UserId,
  approvedComment: z.string().max(1024),
});
export type UpdateStatusToApprovedInput = z.infer<typeof UpdateStatusToApprovedInput>;
export type UpdateStatusToApprovedResult = ResultAsync<ApprovedRequest, DBError>;

export const UpdateStatusToRejectedInput = z.object({
  catalogId: CatalogId,
  approvalFlowId: ApprovalFlowId,
  requestId: z.string(),
  rejectedDate: z.string().datetime(),
  userIdWhoRejected: UserId,
  rejectComment: z.string().max(1024),
});
export type UpdateStatusToRejectedInput = z.infer<typeof UpdateStatusToRejectedInput>;
export type UpdateStatusToRejectedResult = ResultAsync<RejectedRequest, DBError>;

export const UpdateStatusToRevokedInput = z.object({
  catalogId: CatalogId,
  approvalFlowId: ApprovalFlowId,
  requestId: z.string(),
  revokedDate: z.string().datetime(),
  userIdWhoRevoked: UserId,
  revokedComment: z.string().max(1024),
});
export type UpdateStatusToRevokedInput = z.infer<typeof UpdateStatusToRevokedInput>;
export type UpdateStatusToRevokedResult = ResultAsync<RevokedRequest, DBError>;

export const UpdateStatusToCanceledInput = z.object({
  catalogId: CatalogId,
  approvalFlowId: ApprovalFlowId,
  requestId: z.string(),
  canceledDate: z.string().datetime(),
  userIdWhoCanceled: UserId,
  cancelComment: z.string().max(1024),
});
export type UpdateStatusToCanceledInput = z.infer<typeof UpdateStatusToCanceledInput>;
export type UpdateStatusToCanceledResult = ResultAsync<CanceledRequest, DBError>;

export const RequestDateQuery = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});
export type RequestDateQuery = z.infer<typeof RequestDateQuery>;

export const ApprovalFlowInput = z.object({
  catalogId: CatalogId,
  approvalFlowId: ApprovalFlowId,
  paginationToken: z.string().optional(),
  requestDate: RequestDateQuery.optional(),
  limit: z.number().optional(),
});
export type ApprovalFlowInput = z.infer<typeof ApprovalFlowInput>;

export type ApprovalRequestDBProvider = {
  getById(requestId: string): ApprovalRequestDBGetByIdResult;
  listByApprovalFlowId(input: ApprovalFlowInput): ApprovalRequestDBListResult;
  listByRequestUserId(input: { requestUserId: string; paginationToken?: string; requestDate?: RequestDateQuery; limit?: number }): ApprovalRequestDBListResult;
  listByApproverId(input: { approverId: string; paginationToken?: string; requestDate?: RequestDateQuery }): ApprovalRequestDBListResult;
  set<
    T extends
      | SubmittedRequest
      | ValidationFailedRequest
      | PendingRequest
      | ApprovedRequest
      | ApprovedActionSucceededRequest
      | ApprovedActionFailedRequest
      | RejectedRequest
      | CanceledRequest
      | RevokedRequest
      | RevokedActionSucceededRequest
      | RevokedActionFailedRequest
  >(
    approvalRequest: T
  ): ApprovalRequestDBSetResult<T>;
  updateStatusToApproved(input: UpdateStatusToApprovedInput): UpdateStatusToApprovedResult;
  updateStatusToRejected(input: UpdateStatusToRejectedInput): UpdateStatusToRejectedResult;
  updateStatusToRevoked(input: UpdateStatusToRevokedInput): UpdateStatusToRevokedResult;
  updateStatusToCanceled(input: UpdateStatusToCanceledInput): UpdateStatusToCanceledResult;
};
