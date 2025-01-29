"use server";
import { cacheStampHubClient } from "@/utils/stampHubClient";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/utils/sessionUser";
import { StampHubRouterInput } from "@stamp-lib/stamp-hub";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  const url = new URL(request.url);
  const urlSearchParams = new URLSearchParams(url.search);
  const groupId = urlSearchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "catalogId or resourceTypeId is null" });
  }

  const input: StampHubRouterInput["userRequest"]["group"]["get"] = {
    requestUserId: sessionUser.stampUserId,
    groupId: groupId,
  };

  const group = await cacheStampHubClient.userRequest.group.get.query(input);
  return NextResponse.json(group);
}
