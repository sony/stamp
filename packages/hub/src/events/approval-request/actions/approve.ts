import { ApprovedRequest, ApprovedActionSucceededRequest, ApprovedActionFailedRequest, ApprovalFlowConfig } from "@stamp-lib/stamp-types/models";
import { convertStampHubError, StampHubError } from "../../../error";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";

import { z } from "zod";

import { ResultAsync } from "neverthrow";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { convertPromiseResultToResultAsync } from "../../../utils/neverthrow";

export const ExecuteApprovedActionInput = ApprovedRequest;
export type ExecuteApprovedActionInput = z.infer<typeof ExecuteApprovedActionInput>;
export type ExecuteApprovedAction = (
  input: ExecuteApprovedActionInput
) => ResultAsync<ApprovedActionSucceededRequest | ApprovedActionFailedRequest, StampHubError>;
export const executeApprovedAction =
  (
    approvalRequestApprovalHandler: ApprovalFlowConfig["handlers"]["approved"],
    setApprovalRequestDBProvider: ApprovalRequestDBProvider["set"]
  ): ExecuteApprovedAction =>
  (input: ExecuteApprovedActionInput) => {
    return parseZodObjectAsync(input, ExecuteApprovedActionInput)
      .andThen(callApprovedHandler(approvalRequestApprovalHandler))
      .andThen(setApprovalRequestDBProvider)
      .mapErr(convertStampHubError);
  };

const callApprovedHandler =
  (approvedHandler: ApprovalFlowConfig["handlers"]["approved"]) =>
  (input: ExecuteApprovedActionInput): ResultAsync<ApprovedActionSucceededRequest | ApprovedActionFailedRequest, StampHubError> => {
    const pendingRequest = structuredClone(input);
    const handlersInputParams: Record<string, { value: string | number | boolean; id: string }> = {};
    for (const inputParam of pendingRequest.inputParams) {
      handlersInputParams[inputParam.id] = structuredClone(inputParam);
    }
    const handlersInputResources: Record<string, { resourceTypeId: string; resourceId: string }> = {};
    for (const inputResource of pendingRequest.inputResources) {
      handlersInputResources[inputResource.resourceTypeId] = structuredClone(inputResource);
    }

    const approvedDate = new Date().toISOString();
    return convertPromiseResultToResultAsync()(
      approvedHandler({
        requestId: pendingRequest.requestId,
        approvalFlowId: pendingRequest.approvalFlowId,
        requestUserId: pendingRequest.requestUserId,
        approverId: pendingRequest.approverId,
        inputParams: handlersInputParams,
        inputResources: handlersInputResources,
        requestDate: pendingRequest.requestDate,
        approvedDate: approvedDate,
      })
    ).map((approvedHandlerResult) => {
      if (!approvedHandlerResult.isSuccess) {
        return {
          ...structuredClone(pendingRequest),
          status: "approvedActionFailed",
          approvedDate: approvedDate,
          approvedHandlerResult: structuredClone({
            isSuccess: approvedHandlerResult.isSuccess,
            message: approvedHandlerResult.message,
          }),
          approvedComment: input.approvedComment,
          userIdWhoApproved: input.userIdWhoApproved,
        };
      } else {
        return {
          ...structuredClone(pendingRequest),
          status: "approvedActionSucceeded",
          approvedDate: approvedDate,
          approvedHandlerResult: structuredClone({
            isSuccess: approvedHandlerResult.isSuccess,
            message: approvedHandlerResult.message,
          }),
          approvedComment: input.approvedComment,
          userIdWhoApproved: input.userIdWhoApproved,
        };
      }
    });
  };
