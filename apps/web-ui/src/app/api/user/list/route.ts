"use server";

import { stampHubClient } from "@/utils/stampHubClient";
import { StampHubRouterInput } from "@stamp-lib/stamp-hub";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const urlSearchParams = new URLSearchParams(url.search);
  const limit = urlSearchParams.get("limit");
  const paginationToken = urlSearchParams.get("paginationToken");

  const input: StampHubRouterInput["systemRequest"]["user"]["list"] = {
    limit: limit ? Number(limit) : undefined,
    paginationToken: paginationToken ?? undefined,
  };

  const users = await stampHubClient.systemRequest.user.list.query(input);
  return NextResponse.json(users);
}
