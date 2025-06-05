import { z } from "zod";
import { CatalogId } from "./id";
import { ApprovalFlowId } from "./id";
import { UserId } from "../pluginInterface/identity";
export const ApprovalRequestInputParam = z.object({
  id: z.string().max(128),
  value: z.union([z.string().max(128), z.number(), z.boolean()]),
});
export type ApprovalRequestInputParam = z.infer<typeof ApprovalRequestInputParam>;

export const ApprovalRequestInputResource = z.object({
  resourceId: z.string(),
  resourceTypeId: z.string(),
});
export type ApprovalRequestInputResource = z.infer<typeof ApprovalRequestInputResource>;

export const ApproverType = z.enum(["group"]);
export type ApproverType = z.infer<typeof ApproverType>;

export const AutoRevokeDuration = z.string().regex(/^P(?:(?:\d+D(?:T\d+H)?)|(?:T\d+H))$/, "Invalid ISO 8601 duration format. Expected format: PnDTnH");
export type AutoRevokeDuration = z.infer<typeof AutoRevokeDuration>;

export const SubmittedRequest = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["submitted"]),
  catalogId: CatalogId,
  approvalFlowId: ApprovalFlowId,
  inputParams: z.array(ApprovalRequestInputParam).max(5),
  inputResources: z.array(ApprovalRequestInputResource).max(5),
  requestUserId: UserId,
  approverType: ApproverType,
  approverId: z.string().uuid(),
  requestDate: z.string().datetime(),
  requestComment: z.string().max(1024),
  autoRevokeDuration: AutoRevokeDuration.optional(),
});
export type SubmittedRequest = z.infer<typeof SubmittedRequest>;

export const ValidationFailedRequest = SubmittedRequest.extend({
  status: z.enum(["validationFailed"]),
  validatedDate: z.string().datetime(),
  validationHandlerResult: z.object({
    isSuccess: z.literal(false),
    message: z.string(),
  }),
});
export type ValidationFailedRequest = z.infer<typeof ValidationFailedRequest>;

export const PendingRequest = SubmittedRequest.extend({
  status: z.enum(["pending"]),
  validatedDate: z.string().datetime(),
  validationHandlerResult: z.object({
    isSuccess: z.literal(true),
    message: z.string(),
  }),
});
export type PendingRequest = z.infer<typeof PendingRequest>;

export const CanceledRequest = PendingRequest.extend({
  status: z.enum(["canceled"]),
  canceledDate: z.string().datetime(),
  userIdWhoCanceled: UserId,
  cancelComment: z.string().max(1024),
});
export type CanceledRequest = z.infer<typeof CanceledRequest>;

export const ApprovedRequest = PendingRequest.extend({
  status: z.enum(["approved"]),
  approvedDate: z.string().datetime(),
  userIdWhoApproved: UserId,
  approvedComment: z.string().max(1024),
  // approvedHandlerResult is optional because previous stamp hub versions of the model have this field.
  // This property is to remove in the future.
  approvedHandlerResult: z
    .object({
      isSuccess: z.literal(true),
      message: z.string().max(1024),
    })
    .optional(),
});
export type ApprovedRequest = z.infer<typeof ApprovedRequest>;

export const ApprovedActionSucceededRequest = ApprovedRequest.extend({
  status: z.enum(["approvedActionSucceeded"]),
  approvedHandlerResult: z.object({
    isSuccess: z.literal(true),
    message: z.string().max(1024),
  }),
});
export type ApprovedActionSucceededRequest = z.infer<typeof ApprovedActionSucceededRequest>;

export const ApprovedActionFailedRequest = ApprovedRequest.extend({
  status: z.enum(["approvedActionFailed"]),
  approvedHandlerResult: z.object({
    isSuccess: z.literal(false),
    message: z.string().max(1024),
  }),
});
export type ApprovedActionFailedRequest = z.infer<typeof ApprovedActionFailedRequest>;

export const RejectedRequest = PendingRequest.extend({
  status: z.enum(["rejected"]),
  rejectedDate: z.string().datetime(),
  userIdWhoRejected: UserId,
  rejectComment: z.string().max(1024),
});
export type RejectedRequest = z.infer<typeof RejectedRequest>;

export const RevokedRequest = ApprovedActionSucceededRequest.extend({
  status: z.enum(["revoked"]),
  revokedDate: z.string().datetime(),
  revokedComment: z.string().max(1024),
  userIdWhoRevoked: UserId,
  // revokedHandlerResult is optional because previous stamp hub versions of the model have this field.
  // This property is to remove in the future.
  revokedHandlerResult: z
    .object({
      isSuccess: z.literal(true),
      message: z.string().max(1024),
    })
    .optional(),
});
export type RevokedRequest = z.infer<typeof RevokedRequest>;

export const RevokedActionSucceededRequest = RevokedRequest.extend({
  status: z.enum(["revokedActionSucceeded"]),
  revokedHandlerResult: z.object({
    isSuccess: z.literal(true),
    message: z.string().max(1024),
  }),
});
export type RevokedActionSucceededRequest = z.infer<typeof RevokedActionSucceededRequest>;

export const RevokedActionFailedRequest = RevokedRequest.extend({
  status: z.enum(["revokedActionFailed"]),
  revokedHandlerResult: z.object({
    isSuccess: z.literal(false),
    message: z.string().max(1024),
  }),
});
export type RevokedActionFailedRequest = z.infer<typeof RevokedActionFailedRequest>;

export const ApprovalRequest = z.union([
  SubmittedRequest,
  ValidationFailedRequest,
  PendingRequest,
  ApprovedRequest,
  ApprovedActionSucceededRequest,
  ApprovedActionFailedRequest,
  RejectedRequest,
  CanceledRequest,
  RevokedRequest,
  RevokedActionSucceededRequest,
  RevokedActionFailedRequest,
]);
export type ApprovalRequest = z.infer<typeof ApprovalRequest>;
