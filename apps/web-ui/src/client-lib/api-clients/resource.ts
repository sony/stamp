"use client";

import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { ResourceOutline } from "@/type";

export async function listResourceOutlines({
  catalogId,
  resourceTypeId,
  parentResourceId,
  paginationToken,
}: {
  catalogId: string;
  resourceTypeId: string;
  parentResourceId?: string;
  paginationToken?: string;
}): Promise<Array<ResourceOutline>> {
  let url = `/api/resource/list?catalogId=${encodeURIComponent(catalogId)}&resourceTypeId=${encodeURIComponent(resourceTypeId)}`;
  if (parentResourceId) {
    url += `&parentResourceId=${encodeURIComponent(parentResourceId)}`;
  }
  if (paginationToken) {
    url += `&paginationToken=${encodeURIComponent(paginationToken)}`;
  }
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Failed to fetch resources: ${result.statusText}`);
  const response = (await result.json()) as StampHubRouterOutput["userRequest"]["resource"]["listOutlines"];

  if (response.paginationToken) {
    const nextItems = await listResourceOutlines({ catalogId, resourceTypeId, parentResourceId, paginationToken: response.paginationToken });
    return response.items.concat(nextItems);
  }
  return response.items;
}
