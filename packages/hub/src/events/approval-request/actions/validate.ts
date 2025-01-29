import { SubmittedRequest, ValidationFailedRequest, PendingRequest } from "@stamp-lib/stamp-types/models";
import { convertStampHubError, StampHubError } from "../../../error";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ApprovalFlowConfig } from "@stamp-lib/stamp-types/models";
import { z } from "zod";

import { ResultAsync } from "neverthrow";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { convertPromiseResultToResultAsync } from "../../../utils/neverthrow";
export const ValidateApprovalRequestInput = SubmittedRequest;
export type ValidateApprovalRequestInput = z.infer<typeof ValidateApprovalRequestInput>;

export function createValidateApprovalRequest(
  approvalRequestValidationHandler: ApprovalFlowConfig["handlers"]["approvalRequestValidation"],
  setApprovalRequestDBProvider: ApprovalRequestDBProvider["set"]
) {
  return (input: ValidateApprovalRequestInput) => validateApprovalRequestImpl(input, approvalRequestValidationHandler, setApprovalRequestDBProvider);
}

export function validateApprovalRequestImpl(
  input: ValidateApprovalRequestInput,
  approvalRequestValidationHandler: ApprovalFlowConfig["handlers"]["approvalRequestValidation"],
  setApprovalRequestDBProvider: ApprovalRequestDBProvider["set"]
): ResultAsync<ValidationFailedRequest | PendingRequest, StampHubError> {
  const callApprovalRequestValidationHandler = createCallApprovalRequestValidationHandler(approvalRequestValidationHandler);
  return parseZodObjectAsync(input, ValidateApprovalRequestInput)
    .andThen(callApprovalRequestValidationHandler)
    .andThen(setApprovalRequestDBProvider)
    .mapErr(convertStampHubError);
}

function createCallApprovalRequestValidationHandler(approvalRequestValidationHandler: ApprovalFlowConfig["handlers"]["approvalRequestValidation"]) {
  return (input: SubmittedRequest) => callApprovalRequestValidationHandlerImpl(input, approvalRequestValidationHandler);
}

function callApprovalRequestValidationHandlerImpl(
  input: SubmittedRequest,
  approvalRequestValidationHandler: ApprovalFlowConfig["handlers"]["approvalRequestValidation"]
): ResultAsync<ValidationFailedRequest | PendingRequest, StampHubError> {
  const handlersInputParams: Record<string, { value: string | number | boolean; id: string }> = {};
  for (const inputParam of input.inputParams) {
    handlersInputParams[inputParam.id] = structuredClone(inputParam);
  }
  const handlersInputResources: Record<string, { resourceTypeId: string; resourceId: string }> = {};
  for (const inputResource of input.inputResources) {
    handlersInputResources[inputResource.resourceTypeId] = structuredClone(inputResource);
  }

  return convertPromiseResultToResultAsync()(
    approvalRequestValidationHandler({
      inputParams: handlersInputParams,
      inputResources: handlersInputResources,
      requestId: input.requestId,
      requestDate: input.requestDate,
      approvalFlowId: input.approvalFlowId,
      requestUserId: input.requestUserId,
      approverId: input.approverId,
    })
  ).map((validationHandlerResult) => {
    if (validationHandlerResult.isSuccess) {
      return {
        ...structuredClone(input),
        status: "pending",
        validatedDate: new Date().toISOString(),
        validationHandlerResult: structuredClone({
          isSuccess: validationHandlerResult.isSuccess,
          message: validationHandlerResult.message,
        }),
      };
    } else {
      return {
        ...structuredClone(input),
        status: "validationFailed",
        validatedDate: new Date().toISOString(),
        validationHandlerResult: structuredClone({
          isSuccess: validationHandlerResult.isSuccess,
          message: validationHandlerResult.message,
        }),
      };
    }
  });
}
