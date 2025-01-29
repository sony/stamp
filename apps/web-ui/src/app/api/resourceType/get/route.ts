"use server";
import { cacheStampHubClient } from "@/utils/stampHubClient";
import { NextResponse } from "next/server";
import { StampHubRouterInput } from "@stamp-lib/stamp-hub";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const urlSearchParams = new URLSearchParams(url.search);
  const catalogId = urlSearchParams.get("catalogId");
  const resourceTypeId = urlSearchParams.get("resourceTypeId");
  const requestUserId = urlSearchParams.get("requestUserId");

  if (!catalogId || !resourceTypeId || !requestUserId) {
    return NextResponse.json({ error: "catalogId or resourceTypeId, requestUserId is null" });
  }

  const input: StampHubRouterInput["userRequest"]["resourceType"]["get"] = {
    catalogId: catalogId,
    resourceTypeId: resourceTypeId,
    requestUserId: requestUserId,
  };

  const group = await cacheStampHubClient.userRequest.resourceType.get.query(input);
  return NextResponse.json(group);
}
