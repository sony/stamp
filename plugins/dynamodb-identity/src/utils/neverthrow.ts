import { ResultAsync } from "neverthrow";
import { IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { z } from "zod";

/**
 * Parse DB item and return ResultAsync
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Because of accept any zod schema
export function parseDBItemAsync<T extends z.ZodObject<any> | z.ZodUnion<any> | z.ZodArray<any>>(
  input: unknown,
  schema: T
): ResultAsync<z.infer<typeof schema>, IdentityPluginError> {
  return ResultAsync.fromPromise(
    (async () => {
      try {
        return schema.parse(input);
      } catch (error) {
        throw new IdentityPluginError(error.message, "INTERNAL_SERVER_ERROR");
      }
    })(),
    (error) => {
      if (error instanceof IdentityPluginError) {
        return error;
      } else {
        return new IdentityPluginError("Parse DB item is failed", "INTERNAL_SERVER_ERROR");
      }
    }
  );
}

/**
 * Parse DB Input and return ResultAsync
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Because of accept any zod schema
export function parseDBInputAsync<T extends z.ZodObject<any> | z.ZodUnion<any> | z.ZodArray<any>>(
  input: unknown,
  schema: T
): ResultAsync<z.infer<typeof schema>, IdentityPluginError> {
  return ResultAsync.fromPromise(
    (async () => {
      try {
        return schema.parse(input);
      } catch (error) {
        throw new IdentityPluginError(error.message, "INTERNAL_SERVER_ERROR");
      }
    })(),
    (error) => {
      if (error instanceof IdentityPluginError) {
        return error;
      } else {
        return new IdentityPluginError("Parse DB input is failed", "INTERNAL_SERVER_ERROR");
      }
    }
  );
}
