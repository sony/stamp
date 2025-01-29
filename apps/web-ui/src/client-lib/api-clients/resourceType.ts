"use client";

import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { ResourceType } from "@/type";

export async function getResourceType({
  catalogId,
  resourceTypeId,
  requestUserId,
}: {
  catalogId: string;
  resourceTypeId: string;
  requestUserId: string;
}): Promise<ResourceType> {
  const url = `/api/resourceType/get?catalogId=${encodeURIComponent(catalogId)}&resourceTypeId=${encodeURIComponent(
    resourceTypeId
  )}&requestUserId=${encodeURIComponent(requestUserId)}`;
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Failed to fetch resources: ${result.statusText}`);
  const response = (await result.json()) as StampHubRouterOutput["userRequest"]["resourceType"]["get"];
  return response;
}
