"use client";

import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { Resource, ResourceOutline } from "@/type";

export async function getResource({ catalogId, resourceTypeId, resourceId }: { catalogId: string; resourceTypeId: string; resourceId: string }): Promise<Resource> {
  const params = new URLSearchParams({ catalogId, resourceTypeId, resourceId });
  const result = await fetch(`/api/resource/get?${params.toString()}`);
  if (!result.ok) throw new Error(`Failed to fetch resource: ${result.statusText}`);
  return (await result.json()) as StampHubRouterOutput["userRequest"]["resource"]["get"];
}

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
