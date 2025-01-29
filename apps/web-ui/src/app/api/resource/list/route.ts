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
  const parentResourceId = urlSearchParams.get("parentResourceId");
  const paginationToken = urlSearchParams.get("paginationToken");
  if (!catalogId || !resourceTypeId) {
    return NextResponse.json({ error: "catalogId or resourceTypeId is null" });
  }

  const input: StampHubRouterInput["userRequest"]["resource"]["listOutlines"] = {
    requestUserId: sessionUser.stampUserId,
    catalogId: catalogId,
    resourceTypeId: resourceTypeId,
    parentResourceId: parentResourceId ?? undefined,
    paginationToken: paginationToken ?? undefined,
  };

  const resources = await stampHubClient.userRequest.resource.listOutlines.query(input);
  return NextResponse.json(resources);
}
