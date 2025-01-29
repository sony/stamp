import { StampHubRouterClient } from "@stamp-lib/stamp-hub";
import { RequestDateQuery } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ApprovalRequest } from "@/type";

export const listApprovalRequestsByUser = async (
  listByRequestUserId: StampHubRouterClient["userRequest"]["approvalRequest"]["listByRequestUserId"],
  userId: string,
  requestDateQuery?: RequestDateQuery,
  limit?: number,
  filterFunction?: (approvalRequests: ApprovalRequest[]) => ApprovalRequest[],
  paginationToken?: string
): Promise<Array<ApprovalRequest>> => {
  const approvalRequest = await listByRequestUserId.query({
    userId: userId,
    requestUserId: userId,
    requestDate: requestDateQuery,
    paginationToken: paginationToken,
    limit: limit,
  });

  let filteredApprovalRequests = approvalRequest.items;
  if (filterFunction) {
    filteredApprovalRequests = filterFunction(approvalRequest.items);
  }

  if ((limit === undefined || filteredApprovalRequests.length < limit) && approvalRequest.paginationToken) {
    const nextItems = await listApprovalRequestsByUser(listByRequestUserId, userId, requestDateQuery, limit, filterFunction, approvalRequest.paginationToken);
    return filteredApprovalRequests.concat(nextItems).slice(0, limit);
  }
  return filteredApprovalRequests.slice(0, limit);
};
