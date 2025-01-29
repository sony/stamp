import { StampHubRouter } from "./router";

import { createTRPCProxyClient, httpBatchLink, httpLink, TRPCClientError, CreateTRPCProxyClient } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export function createStampHubHTTPServerBatchClient(url: string, customFetch?: (input: string | Request, init?: RequestInit | undefined) => Promise<Response>) {
  const client = createTRPCProxyClient<StampHubRouter>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- for customFetch cast
    links: [httpBatchLink({ url: url, fetch: customFetch as any })],
  });

  return client;
}

export function createStampHubHTTPServerClient(url: string, customFetch?: (input: string | Request, init?: RequestInit | undefined) => Promise<Response>) {
  const client = createTRPCProxyClient<StampHubRouter>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- for customFetch cast
    links: [httpLink({ url: url, fetch: customFetch as any })],
  });

  return client;
}
export type StampHubRouterInput = inferRouterInputs<StampHubRouter>;
export type StampHubRouterOutput = inferRouterOutputs<StampHubRouter>;
export type StampHubRouterClient = CreateTRPCProxyClient<StampHubRouter>;

export function isStampHubClientError(cause: unknown): cause is TRPCClientError<StampHubRouter> {
  return cause instanceof TRPCClientError;
}
