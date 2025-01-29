import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { ApprovalFlowId, CatalogConfig } from "@stamp-lib/stamp-types/models";

export const ValidateApprovalFlowIdInput = z.object({
  catalogConfig: CatalogConfig,
  approvalFlowId: ApprovalFlowId,
});

export type ValidateApprovalFlowIdInput = z.infer<typeof ValidateApprovalFlowIdInput>;

export type ValidateApprovalFlowId = <T extends ValidateApprovalFlowIdInput>(input: T) => ResultAsync<T, StampHubError>;

export function validateApprovalFlowId<T extends ValidateApprovalFlowIdInput>(input: T): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, ValidateApprovalFlowIdInput)
    .andThen((parsedInput) => {
      const approvalFlow = parsedInput.catalogConfig.approvalFlows.find((approvalFlow) => approvalFlow.id === parsedInput.approvalFlowId);
      if (approvalFlow != undefined) {
        return okAsync(input);
      } else {
        return errAsync(new StampHubError("ApprovalFlow not found", "ApprovalFlow Not Found", "BAD_REQUEST"));
      }
    })
    .mapErr(convertStampHubError);
}
