import { ApprovalFlowDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { okAsync } from "neverthrow";
import { ApprovalFlowId, ApprovalFlowInfoOnDB, CatalogId } from "@stamp-lib/stamp-types/models";
import { some, none } from "@stamp-lib/stamp-option";
import { Logger } from "@stamp-lib/stamp-logger";

const approvalFlowMap = new Map<string, ApprovalFlowInfoOnDB>();
export function createApprovalFlowDBProvider(logger: Logger): ApprovalFlowDBProvider {
  return {
    getById: (catalogId: string, approvalFlowId: string) => {
      logger.info("ApprovalFlowDB.getById", catalogId, approvalFlowId);
      const id = `${catalogId}#${approvalFlowId}`;
      const approvalFlow = structuredClone(approvalFlowMap.get(id));
      if (approvalFlow === undefined) {
        return okAsync(none);
      } else {
        return okAsync(some(approvalFlow));
      }
    },
    listByCatalogId: (catalogId: string) => {
      logger.info("ApprovalFlowDB.listByCatalogId", catalogId);
      const approvalFlows = structuredClone(Array.from(approvalFlowMap.values()));
      const filteredApprovalFlows = approvalFlows.filter((approvalFlow) => approvalFlow.catalogId === catalogId);

      return okAsync(filteredApprovalFlows);
    },
    set: (approvalFlow: ApprovalFlowInfoOnDB) => {
      logger.info("ApprovalFlowDB.set", approvalFlow);
      const id = `${approvalFlow.catalogId}#${approvalFlow.id}`;
      approvalFlowMap.set(id, structuredClone(approvalFlow));
      return okAsync(structuredClone(approvalFlow));
    },
    delete: (catalogId: CatalogId, approvalFlowId: ApprovalFlowId) => {
      const id = `${catalogId}#${approvalFlowId}`;
      logger.info("ApprovalFlowDB.delete", id);
      approvalFlowMap.delete(id);
      return okAsync(undefined);
    },
  };
}
