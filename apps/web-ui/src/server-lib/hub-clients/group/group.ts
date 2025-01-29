import { StampHubRouterClient } from "@stamp-lib/stamp-hub";
import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";

export async function listGroups(
  listByRequestUserId: StampHubRouterClient["userRequest"]["group"]["list"],
  requestUserId: string,
  limit?: number,
  paginationToken?: string
): Promise<Array<Group>> {
  const res = await listByRequestUserId.query({
    requestUserId: requestUserId,
    paginationToken: paginationToken,
  });
  if ((limit === undefined || res.items.length < limit) && res.nextPaginationToken) {
    const nextGroups = await listGroups(listByRequestUserId, requestUserId, limit, res.nextPaginationToken);
    return res.items.concat(nextGroups).slice(0, limit);
  }
  return res.items.slice(0, limit);
}
