import { isStampHubClientError } from "@stamp-lib/stamp-hub";

// If the promise is rejected and error is NOT_FOUND, return defaultValue.
export const unwrapOr = async <T, F>(promise: Promise<T>, defaultValue: F): Promise<T | F> => {
  try {
    return await promise;
  } catch (e) {
    if (isStampHubClientError(e)) {
      if (e.data?.code === "NOT_FOUND") {
        return defaultValue;
      }
    }
    throw e;
  }
};
