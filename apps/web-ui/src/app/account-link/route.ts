export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  const accountLinkSession = await stampHubClient.systemRequest.accountLink.listByUserId.query({ userId: sessionUser.stampUserId });
  return NextResponse.json(accountLinkSession);
}
