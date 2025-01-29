import { Result, ok, err, ResultAsync, okAsync, errAsync } from "neverthrow";
import { StampHubError, convertStampHubErrorFromUnknown } from "../error";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Option } from "@stamp-lib/stamp-option";
import { Logger } from "@stamp-lib/stamp-logger";

/**
 * Convert Promise<Result<T, E>> to ResultAsync<T, StampHubError>
 */
export const convertPromiseResultToResultAsync =
  (logger: Logger | undefined = undefined) =>
  <T, E extends Error>(promise: Promise<Result<T, E>>): ResultAsync<T, StampHubError> => {
    return ResultAsync.fromPromise(
      (async () => {
        const result = await promise;
        if (result.isErr()) {
          throw result.error;
        } else {
          return result.value;
        }
      })(),
      convertStampHubErrorFromUnknown(logger)
    );
  };

export function unwrapOrthrowTRPCError<T>(input: Result<T, TRPCError>): T {
  if (input.isOk()) {
    return input.value;
  } else {
    throw input.error;
  }
}

export function unwrapOptionOrThrowNotFound<T>(input: Option<T>, itemName?: string): ResultAsync<T, TRPCError> {
  if (input.isNone()) {
    return errAsync(new TRPCError({ message: `${itemName ?? "Item"} not found`, code: "NOT_FOUND" }));
  } else {
    return okAsync(input.value);
  }
}

/**
 * Parse zod object and return ResultAsync
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Because of accept any zod schema
export function parseZodObjectAsync<T extends z.ZodObject<any> | z.ZodUnion<any>>(
  input: unknown,
  schema: T
): ResultAsync<z.infer<typeof schema>, StampHubError> {
  return ResultAsync.fromPromise(
    (async () => {
      try {
        return schema.parse(input);
      } catch (error) {
        throw new StampHubError(error.message, error.message, "BAD_REQUEST");
      }
    })(),
    (error) => {
      if (error instanceof StampHubError) {
        return error;
      } else {
        return new StampHubError("parseZodObject is failed", "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    }
  );
}

/**
 * Parse zod object and return Result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Because of accept any zod schema
export function parseZodObject<T extends z.ZodObject<any> | z.ZodUnion<any>>(input: unknown, schema: T): Result<z.infer<typeof schema>, StampHubError> {
  try {
    return ok(schema.parse(input));
  } catch (error) {
    return err(new StampHubError(error.message, error.message, "BAD_REQUEST"));
  }
}
