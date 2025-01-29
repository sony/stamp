import { StampHubError, convertStampHubError } from "../../error";
import { ApprovalFlowDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ApprovalFlowConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResultAsync } from "neverthrow";
import { ApprovalFlowInfo, ApprovalFlowInfoOnDB } from "@stamp-lib/stamp-types/models";

export type ListApprovalFlow = (catalogId: string) => ResultAsync<Array<ApprovalFlowInfo>, StampHubError>;

export const listApprovalFlowInfo =
  (listByCatalogId: ApprovalFlowDBProvider["listByCatalogId"], listInfoByCatalogId: ApprovalFlowConfigProvider["listInfoByCatalogId"]): ListApprovalFlow =>
  (catalogId) => {
    const approvalFlowDBListResult = listByCatalogId(catalogId);
    const listApprovalFlowInfoOnConfigResult = listInfoByCatalogId(catalogId);
    return ResultAsync.combine([approvalFlowDBListResult, listApprovalFlowInfoOnConfigResult])
      .map(([approvalFlowsInfoOnDb, approvalFlowsInfoOnConfig]) => {
        const approvalFlowsInfo = new Array<ApprovalFlowInfo>();
        const approvalFlowsInfoOnDbMap = new Map<string, ApprovalFlowInfoOnDB>();
        approvalFlowsInfoOnDb.forEach((approvalFlowInfoOnDb) => {
          approvalFlowsInfoOnDbMap.set(approvalFlowInfoOnDb.id, approvalFlowInfoOnDb);
        });

        for (const approvalFlowInfoOnConfig of approvalFlowsInfoOnConfig) {
          const approvalFlowInfoOnDb = approvalFlowsInfoOnDbMap.get(approvalFlowInfoOnConfig.id);
          if (approvalFlowInfoOnDb === undefined) {
            approvalFlowsInfo.push({ ...approvalFlowInfoOnConfig });
          } else {
            approvalFlowsInfo.push({ ...approvalFlowInfoOnDb, ...approvalFlowInfoOnConfig });
          }
        }
        return approvalFlowsInfo;
      })
      .mapErr(convertStampHubError);
  };
