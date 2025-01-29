import { SubmittedRequest } from "@stamp-lib/stamp-types/models";
import { convertStampHubError, StampHubError } from "../../../error";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { z } from "zod";

import { ResultAsync } from "neverthrow";
import { uuidv7 } from "uuidv7";
export const SubmitApprovalRequestInput = SubmittedRequest.omit({ requestId: true, status: true, requestDate: true });
export type SubmitApprovalRequestInput = z.infer<typeof SubmitApprovalRequestInput>;

export function createSubmitApprovalRequest(setApprovalRequestDBProvider: ApprovalRequestDBProvider["set"]) {
  return (input: SubmitApprovalRequestInput) => submitApprovalRequestImpl(input, setApprovalRequestDBProvider);
}

export function submitApprovalRequestImpl(
  input: SubmitApprovalRequestInput,
  setApprovalRequestDBProvider: ApprovalRequestDBProvider["set"]
): ResultAsync<SubmittedRequest, StampHubError> {
  return parseZodObjectAsync(input, SubmitApprovalRequestInput)
    .andThen((input) => {
      return setApprovalRequestDBProvider({
        ...input,
        requestId: uuidv7(),
        status: "submitted",
        requestDate: new Date().toISOString(),
      });
    })
    .mapErr(convertStampHubError);
}
