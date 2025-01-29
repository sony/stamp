import { StampHubError, convertStampHubError } from "../../error";
import { ApprovalFlowDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ApprovalFlowConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { z } from "zod";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync } from "neverthrow";
import { ApprovalFlowId, CatalogId } from "@stamp-lib/stamp-types/models";
import { ApprovalFlowInfo } from "@stamp-lib/stamp-types/models";
import { Option, none, some } from "@stamp-lib/stamp-option";

export const GetApprovalFlowInput = z.object({
  catalogId: CatalogId,
  approvalFlowId: ApprovalFlowId,
});
export type GetApprovalFlowInput = z.infer<typeof GetApprovalFlowInput>;
export type GetApprovalFlowInfo = <T extends GetApprovalFlowInput>(input: T) => ResultAsync<Option<ApprovalFlowInfo>, StampHubError>;

export const getApprovalFlow =
  (getApprovalFlowInfo: ApprovalFlowDBProvider["getById"], getApprovalFlowInfoConfig: ApprovalFlowConfigProvider["getInfo"]): GetApprovalFlowInfo =>
  (input) => {
    return parseZodObjectAsync(input, GetApprovalFlowInput)
      .andThen((parsedInput) => {
        const approvalFlowDBGetByIdResult = getApprovalFlowInfo(parsedInput.catalogId, parsedInput.approvalFlowId);
        const approvalFlowConfigGetInfoResult = getApprovalFlowInfoConfig(parsedInput.catalogId, parsedInput.approvalFlowId);
        return ResultAsync.combine([approvalFlowDBGetByIdResult, approvalFlowConfigGetInfoResult]).map(([approvalFlowInfoOnDB, approvalFlowInfoOnConfig]) => {
          if (approvalFlowInfoOnConfig.isNone()) {
            return none;
          } else {
            if (approvalFlowInfoOnDB.isNone()) {
              return some({ ...approvalFlowInfoOnConfig.value });
            } else {
              return some({ ...approvalFlowInfoOnDB.value, ...approvalFlowInfoOnConfig.value });
            }
          }
        });
      })
      .mapErr(convertStampHubError);
  };
