"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/utils/sessionUser";

export async function GET() {
  await getSessionUser(); // Validate session user.
  const resource = await stampHubClient.systemRequest.notification.listNotificationTypes.query();
  return NextResponse.json(resource);
}
