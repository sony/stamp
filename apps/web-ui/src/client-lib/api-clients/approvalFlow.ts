"use client";

import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { ApprovalFlow } from "@/type";

export async function getApprovalFlow({ catalogId, approvalFlowId }: { catalogId: string; approvalFlowId: string }): Promise<ApprovalFlow> {
  const url = `/api/approvalFlow/get?catalogId=${encodeURIComponent(catalogId)}&approvalFlowId=${encodeURIComponent(approvalFlowId)}`;
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Failed to fetch resources: ${result.statusText}`);
  const response = (await result.json()) as StampHubRouterOutput["userRequest"]["approvalFlow"]["get"];
  return response;
}
