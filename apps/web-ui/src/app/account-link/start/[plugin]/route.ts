export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";

export async function GET(request: Request, { params }: { params: { plugin: string } }) {
  const pluginName = params.plugin;
  const sessionUser = await getSessionUser();
  const accountLinkSession = await stampHubClient.systemRequest.accountLinkSession.start.mutate({ accountProviderName: pluginName, userId: sessionUser.stampUserId });
  const response = NextResponse.redirect(process.env.HOST_URL! + `/plugin/${pluginName}/account-link`);
  // If the HOST_URL environment variable starts with "http://", set the secure attribute of the cookie to false.
  const secure = process.env.HOST_URL?.startsWith("http://") ? false : true;
  response.cookies.set("stampAccountLinkSessionKey", accountLinkSession.sessionKey, { httpOnly: true, sameSite: "lax", secure });
  return response;
}
