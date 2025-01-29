import { AnyRouter } from "@trpc/server";
import { BrowserContext } from "@playwright/test";
import { setUpMockStampServer, setUpMockNextServer } from "./mockServerSetup";
import { setupSessionCookie } from "./sessionCookieSetup";

export async function runTestWithMockServers(context: BrowserContext, mockStampHubRouter: AnyRouter, testFunc: () => Promise<void>) {
  await setupSessionCookie(context);
  const tearDownMockStampServer = await setUpMockStampServer(mockStampHubRouter);
  const tearDownMockNextServer = await setUpMockNextServer();
  try {
    await testFunc();
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  } finally {
    await tearDownMockNextServer();
    await tearDownMockStampServer();
  }
}
