import "server-only";
import { createStampHubHTTPServerClient, createStampHubHTTPServerBatchClient, isStampHubClientError } from "@stamp-lib/stamp-hub";

const noCacheFetch = (input: RequestInfo | URL, init?: RequestInit | undefined) => {
  const modifiedInit = { ...init, cache: "no-store" } as RequestInit;
  return fetch(input, modifiedInit);
};

const cacheFetch = (input: RequestInfo | URL, init?: RequestInit | undefined) => {
  const modifiedInit = { ...init, next: { revalidate: 3600 } } as RequestInit;
  return fetch(input, modifiedInit);
};

export const stampHubClient = createStampHubHTTPServerBatchClient("http://localhost:4000", noCacheFetch);
export const cacheStampHubClient = createStampHubHTTPServerClient("http://localhost:4000", cacheFetch);

// If the promise is rejected and error is NOT_FOUND, return defaultValue.
export const unwrapOr = async <T, F>(promise: Promise<T>, defaultValue: F): Promise<T | F> => {
  try {
    return await promise;
  } catch (e) {
    if (isStampHubClientError(e)) {
      return defaultValue;
    }
    throw e;
  }
};
