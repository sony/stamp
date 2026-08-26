"use client";

import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { Group } from "@/type";

/**
 * List groups visible to the current user via /api/group/list, following pagination to the end.
 */
export async function listGroups({ groupNamePrefix, paginationToken }: { groupNamePrefix?: string; paginationToken?: string } = {}): Promise<Array<Group>> {
  const params = new URLSearchParams();
  if (groupNamePrefix) {
    params.set("groupNamePrefix", groupNamePrefix);
  }
  if (paginationToken) {
    params.set("paginationToken", paginationToken);
  }
  const query = params.toString();
  const url = query ? `/api/group/list?${query}` : "/api/group/list";
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Failed to fetch groups: ${result.statusText}`);
  const response = (await result.json()) as StampHubRouterOutput["userRequest"]["group"]["list"];
  if (response.nextPaginationToken) {
    const nextItems = await listGroups({ groupNamePrefix, paginationToken: response.nextPaginationToken });
    return response.items.concat(nextItems);
  }
  return response.items;
}
