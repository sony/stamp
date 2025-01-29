import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { ApprovalFlowId, ApprovalFlowConfig, CatalogConfig } from "@stamp-lib/stamp-types/models";

export const GetApprovalFlowConfigInput = z.object({
  catalogConfig: CatalogConfig,
  approvalFlowId: ApprovalFlowId,
});

export type GetApprovalFlowConfigInput = z.infer<typeof GetApprovalFlowConfigInput>;

export type GetApprovalFlowConfig = <T extends GetApprovalFlowConfigInput>(
  input: T
) => ResultAsync<T & { approvalFlowConfig: ApprovalFlowConfig }, StampHubError>;

export function getApprovalFlowConfig<T extends GetApprovalFlowConfigInput>(
  input: T
): ResultAsync<T & { approvalFlowConfig: ApprovalFlowConfig }, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, GetApprovalFlowConfigInput)
    .andThen((parsedInput) => {
      const approvalFlow = parsedInput.catalogConfig.approvalFlows.find((approvalFlow) => approvalFlow.id === parsedInput.approvalFlowId);
      if (approvalFlow != undefined) {
        return okAsync({ ...input, approvalFlowConfig: approvalFlow });
      } else {
        return errAsync(new StampHubError("ApprovalFlow not found", "ApprovalFlow Not Found", "BAD_REQUEST"));
      }
    })
    .mapErr(convertStampHubError);
}
