import { StampHubRouterClient } from "@stamp-lib/stamp-hub";
import { RequestDateQuery } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ApprovalRequest } from "@/type";

export const listApprovalRequestsByCatalog = async (
  listByApprovalFlowId: StampHubRouterClient["userRequest"]["approvalRequest"]["listByApprovalFlowId"],
  stampUserId: string,
  approvalFlowId: string,
  catalogId: string,
  requestDateQuery?: RequestDateQuery,
  filterFunction?: (approvalRequests: ApprovalRequest[]) => ApprovalRequest[],
  paginationToken?: string
): Promise<ApprovalRequest[]> => {
  const approvalRequest = await listByApprovalFlowId.query({
    approvalFlowId,
    catalogId,
    requestDate: requestDateQuery,
    requestUserId: stampUserId,
    paginationToken,
  });

  let filteredApprovalRequests = approvalRequest.items;
  if (filterFunction) {
    filteredApprovalRequests = filterFunction(approvalRequest.items);
  }

  if (approvalRequest.paginationToken) {
    const nextItems = await listApprovalRequestsByCatalog(
      listByApprovalFlowId,
      stampUserId,
      approvalFlowId,
      catalogId,
      requestDateQuery,
      filterFunction,
      approvalRequest.paginationToken
    );
    return filteredApprovalRequests.concat(nextItems);
  }
  return filteredApprovalRequests;
};
