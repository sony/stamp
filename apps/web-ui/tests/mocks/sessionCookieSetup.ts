import { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

/**
 * Creates a session token with the given payload.
 *
 * Note: This function requires the NEXTAUTH_SECRET environment variable to be set.
 * Make sure to set this environment variable in your test setup.
 *
 * @param payload The payload to encode into the session token.
 * @returns The session token.
 */
async function createSessionToken(payload: { [key: string]: string }) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not defined");
  }

  const token = await encode({ secret, token: payload, maxAge: 60 * 60 });
  return token;
}

export async function setupSessionCookie(context: BrowserContext) {
  const payload: { [key: string]: string } = {
    name: "dummyName",
    email: "dummyName@dummy.com",
    stampUserId: "00000000-0000-0000-0000-000000000000",
  };

  const sessionToken = await createSessionToken(payload);
  await context.addCookies([
    {
      name: "next-auth.session-token.localhost",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: true,
    },
  ]);
}
