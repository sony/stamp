import { initTRPC, AnyRouter } from "@trpc/server";
import { router } from "@stamp-lib/stamp-hub";

export const t = initTRPC.create();

export type MockRouterConfig = {
  systemRequest?: AnyRouter;
  userRequest?: AnyRouter;
};

export function createMockStampHubRouter(mockRouterConfig: MockRouterConfig) {
  return t.router(mockRouterConfig);
}
