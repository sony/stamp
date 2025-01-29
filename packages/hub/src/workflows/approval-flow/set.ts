import { ApprovalFlowConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ApprovalFlowId, ApprovalFlowInfo, CatalogId } from "@stamp-lib/stamp-types/models";
import { ApprovalFlowDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { StampHubError, convertStampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";

export const SetApprovalFlowInput = z.object({
  catalogId: CatalogId,
  approvalFlowId: ApprovalFlowId,
  approverGroupId: z.string().optional(),
});
export type SetApprovalFlowInput = z.infer<typeof SetApprovalFlowInput>;
export type SetApprovalFlowInfo = <T extends SetApprovalFlowInput>(input: T) => ResultAsync<ApprovalFlowInfo, StampHubError>;

export const setApprovalFlowInfo =
  (setApprovalFlowInfo: ApprovalFlowDBProvider["set"], getApprovalFlowInfoConfig: ApprovalFlowConfigProvider["getInfo"]): SetApprovalFlowInfo =>
  (input) => {
    return parseZodObjectAsync(input, SetApprovalFlowInput).andThen((parsedInput) => {
      const approvalFlowDBGetByIdResult = setApprovalFlowInfo({
        catalogId: parsedInput.catalogId,
        id: parsedInput.approvalFlowId,
        approverGroupId: parsedInput.approverGroupId,
      });
      const approvalFlowConfigGetInfoResult = getApprovalFlowInfoConfig(parsedInput.catalogId, parsedInput.approvalFlowId);
      return ResultAsync.combine([approvalFlowDBGetByIdResult, approvalFlowConfigGetInfoResult])
        .andThen(([approvalFlowDBSet, approvalFlowInfoOnConfig]) => {
          if (approvalFlowInfoOnConfig.isNone()) {
            return errAsync(new StampHubError("ApprovalFlowInfoOnConfig is undefined", "InternalError", "INTERNAL_SERVER_ERROR"));
          } else {
            return okAsync({ ...approvalFlowDBSet, ...approvalFlowInfoOnConfig.value });
          }
        })
        .mapErr(convertStampHubError);
    });
  };
