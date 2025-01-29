"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/utils/sessionUser";
import { StampHubRouterInput } from "@stamp-lib/stamp-hub";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  const url = new URL(request.url);
  const urlSearchParams = new URLSearchParams(url.search);
  const groupNamePrefix = urlSearchParams.get("groupNamePrefix");
  const limit = urlSearchParams.get("limit");
  const paginationToken = urlSearchParams.get("paginationToken");

  const input: StampHubRouterInput["userRequest"]["group"]["list"] = {
    requestUserId: sessionUser.stampUserId,
    groupNamePrefix: groupNamePrefix ?? undefined,
    limit: limit ? Number(limit) : undefined,
    paginationToken: paginationToken ?? undefined,
  };

  const groups = await stampHubClient.userRequest.group.list.query(input);
  return NextResponse.json(groups);
}
