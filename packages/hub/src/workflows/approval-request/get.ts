import { StampHubError, convertStampHubError } from "../../error";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { z } from "zod";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync } from "neverthrow";
import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";

import { ApprovalRequest } from "@stamp-lib/stamp-types/models";

import { Option } from "@stamp-lib/stamp-option";
export const GetApprovalRequestInput = z.object({
  approvalRequestId: z.string(),
  requestUserId: UserId,
});
export type GetApprovalRequestInput = z.infer<typeof GetApprovalRequestInput>;

export function GetApprovalRequestWorkflow(
  input: GetApprovalRequestInput,

  approvalRequestDBProvider: ApprovalRequestDBProvider
): ResultAsync<Option<ApprovalRequest>, StampHubError> {
  return parseZodObjectAsync(input, GetApprovalRequestInput)
    .andThen((parsedInput) => {
      return approvalRequestDBProvider.getById(parsedInput.approvalRequestId);
    })
    .mapErr(convertStampHubError);
}
