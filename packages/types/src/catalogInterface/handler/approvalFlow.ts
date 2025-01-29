import { z } from "zod";
import { Result } from "neverthrow";
import { HandlerError } from "./error";
import { ApprovalRequestInputResource, ApprovalRequestInputParam } from "../../models";

const ApprovedInput = z.object({
  requestId: z.string().uuid(),
  approvalFlowId: z.string(),
  requestUserId: z.string().uuid(),
  approverId: z.string().uuid(),
  inputResources: z.record(z.string(), ApprovalRequestInputResource),
  inputParams: z.record(z.string(), ApprovalRequestInputParam),
  requestDate: z.string().datetime(),
  approvedDate: z.string().datetime(),
});

const RevokedInput = ApprovedInput.extend({
  revokedDate: z.string().datetime(),
});

export const ApprovalRequestValidationInput = ApprovedInput.omit({ approvedDate: true });
export type ApprovalRequestValidationInput = z.infer<typeof ApprovalRequestValidationInput>;
export type ApprovedInput = z.infer<typeof ApprovedInput>;
export type RevokedInput = z.infer<typeof RevokedInput>;

export const ApprovalRequestValidationOutput = z.object({
  isSuccess: z.boolean(),
  message: z.string(),
});
export type ApprovalRequestValidationOutput = z.infer<typeof ApprovalRequestValidationOutput>;

export const ApprovedOutput = z.object({
  isSuccess: z.boolean(),
  message: z.string(),
});
export type ApprovedOutput = z.infer<typeof ApprovedOutput>;

export const RevokedOutput = z.object({
  isSuccess: z.boolean(),
  message: z.string(),
});
export type RevokedOutput = z.infer<typeof RevokedOutput>;

export type ApprovalRequestValidation = (input: ApprovalRequestValidationInput) => Promise<Result<ApprovalRequestValidationOutput, HandlerError>>;
export type Approved = (input: ApprovedInput) => Promise<Result<ApprovedOutput, HandlerError>>;
export type Revoked = (input: RevokedInput) => Promise<Result<RevokedOutput, HandlerError>>;

export type ApprovalFlowHandler = {
  approvalRequestValidation: ApprovalRequestValidation;
  approved: Approved;
  revoked: Revoked;
};
