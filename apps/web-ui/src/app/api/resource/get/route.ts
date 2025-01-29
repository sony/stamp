"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/utils/sessionUser";
import { StampHubRouterInput } from "@stamp-lib/stamp-hub";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  const url = new URL(request.url);
  const urlSearchParams = new URLSearchParams(url.search);
  const catalogId = urlSearchParams.get("catalogId");
  const resourceTypeId = urlSearchParams.get("resourceTypeId");
  const resourceId = urlSearchParams.get("resourceId");
  if (!catalogId || !resourceTypeId || !resourceId) {
    return NextResponse.json({ error: "catalogId or resourceTypeId or resourceId is null" });
  }
  const input: StampHubRouterInput["userRequest"]["resource"]["get"] = {
    requestUserId: sessionUser.stampUserId,
    catalogId: catalogId,
    resourceTypeId: resourceTypeId,
    resourceId: resourceId,
  };

  const resource = await stampHubClient.userRequest.resource.get.query(input);
  return NextResponse.json(resource);
}
