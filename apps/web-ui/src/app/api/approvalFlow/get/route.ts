"use server";
import { cacheStampHubClient } from "@/utils/stampHubClient";
import { NextResponse } from "next/server";
import { StampHubRouterInput } from "@stamp-lib/stamp-hub";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const urlSearchParams = new URLSearchParams(url.search);
  const catalogId = urlSearchParams.get("catalogId");
  const approvalFlowId = urlSearchParams.get("approvalFlowId");

  if (!catalogId || !approvalFlowId) {
    return NextResponse.json({ error: "catalogId or approvalFlowId is null" });
  }

  const input: StampHubRouterInput["userRequest"]["approvalFlow"]["get"] = {
    catalogId: catalogId,
    approvalFlowId: approvalFlowId,
  };

  const group = await cacheStampHubClient.userRequest.approvalFlow.get.query(input);
  return NextResponse.json(group);
}
