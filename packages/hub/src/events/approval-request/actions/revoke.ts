import { RevokedRequest, RevokedActionSucceededRequest, RevokedActionFailedRequest } from "@stamp-lib/stamp-types/models";
import { convertStampHubError, StampHubError } from "../../../error";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ApprovalFlowConfig } from "@stamp-lib/stamp-types/models";
import { z } from "zod";

import { ResultAsync } from "neverthrow";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { convertPromiseResultToResultAsync } from "../../../utils/neverthrow";

export const RevokeApprovalRequestInput = RevokedRequest;
export type RevokeApprovalRequestInput = z.infer<typeof RevokeApprovalRequestInput>;
export type RevokeApprovalRequest = (
  input: RevokeApprovalRequestInput
) => ResultAsync<RevokedActionSucceededRequest | RevokedActionFailedRequest, StampHubError>;

export const revokeApprovalRequest =
  (
    approvalRequestRevokedHandler: ApprovalFlowConfig["handlers"]["revoked"],
    setApprovalRequestDBProvider: ApprovalRequestDBProvider["set"]
  ): RevokeApprovalRequest =>
  (input: RevokeApprovalRequestInput): ResultAsync<RevokedActionSucceededRequest | RevokedActionFailedRequest, StampHubError> => {
    return parseZodObjectAsync(input, RevokeApprovalRequestInput)
      .andThen(callApprovalRequestRevokedHandler(approvalRequestRevokedHandler))
      .andThen(setApprovalRequestDBProvider)
      .mapErr(convertStampHubError);
  };

const callApprovalRequestRevokedHandler =
  (approvalRequestRevokedHandler: ApprovalFlowConfig["handlers"]["revoked"]) =>
  (input: RevokeApprovalRequestInput): ResultAsync<RevokedActionSucceededRequest | RevokedActionFailedRequest, StampHubError> => {
    const approvedRequest = structuredClone(input);
    const handlersInputParams: Record<string, { value: string | number | boolean; id: string }> = {};
    for (const inputParam of approvedRequest.inputParams) {
      handlersInputParams[inputParam.id] = structuredClone(inputParam);
    }
    const handlersInputResources: Record<string, { resourceTypeId: string; resourceId: string }> = {};
    for (const inputResource of approvedRequest.inputResources) {
      handlersInputResources[inputResource.resourceTypeId] = structuredClone(inputResource);
    }

    const revokedDate = new Date().toISOString();
    return convertPromiseResultToResultAsync()(
      approvalRequestRevokedHandler({
        requestId: approvedRequest.requestId,
        approvalFlowId: approvedRequest.approvalFlowId,
        requestUserId: approvedRequest.requestUserId,
        approverId: approvedRequest.approverId,
        inputParams: handlersInputParams,
        inputResources: handlersInputResources,
        requestDate: approvedRequest.requestDate,
        approvedDate: approvedRequest.approvedDate,
        revokedDate: revokedDate,
      })
    ).map((revokedHandlerResult) => {
      if (!revokedHandlerResult.isSuccess) {
        return {
          ...structuredClone(approvedRequest),
          status: "revokedActionFailed",
          revokedDate: revokedDate,
          revokedHandlerResult: structuredClone({
            isSuccess: revokedHandlerResult.isSuccess,
            message: revokedHandlerResult.message,
          }),
          revokedComment: input.revokedComment,
          userIdWhoRevoked: input.userIdWhoRevoked,
        };
      } else {
        return {
          ...structuredClone(approvedRequest),
          status: "revokedActionSucceeded",
          revokedDate: revokedDate,
          revokedHandlerResult: structuredClone({
            isSuccess: revokedHandlerResult.isSuccess,
            message: revokedHandlerResult.message,
          }),
          revokedComment: input.revokedComment,
          userIdWhoRevoked: input.userIdWhoRevoked,
        };
      }
    });
  };
