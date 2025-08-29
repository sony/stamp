"use client";

import { StampUser } from "@/type";
import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";

export async function listUsers(paginationToken?: string): Promise<Array<StampUser>> {
  let url = `/api/user/list`;
  if (paginationToken) {
    const params = new URLSearchParams({ paginationToken });
    url += `?${params.toString()}`;
  }
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Failed to fetch resources: ${result.statusText}`);
  const response = (await result.json()) as StampHubRouterOutput["systemRequest"]["user"]["list"];
  if (response.nextPaginationToken) {
    const nextItems = await listUsers(response.nextPaginationToken);
    return response.users.concat(nextItems);
  }
  return response.users;
}
