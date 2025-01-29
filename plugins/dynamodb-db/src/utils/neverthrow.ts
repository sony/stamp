import { ResultAsync } from "neverthrow";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { z } from "zod";
import { Logger } from "@stamp-lib/stamp-logger";

/**
 * Parse DB item and return ResultAsync
 */
export const parseDBItemAsync =
  (logger: Logger) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Because of accept any zod schema
  <T extends z.ZodObject<any> | z.ZodUnion<any> | z.ZodArray<any>>(input: unknown, schema: T): ResultAsync<z.infer<typeof schema>, DBError> => {
    return ResultAsync.fromPromise(
      (async () => {
        try {
          return schema.parse(input);
        } catch (error) {
          throw new DBError(error.message, "INTERNAL_SERVER_ERROR");
        }
      })(),
      (error) => {
        logger.error("Parse DB item is failed", error);
        if (error instanceof DBError) {
          return error;
        } else {
          return new DBError("Parse DB item is failed", "INTERNAL_SERVER_ERROR");
        }
      }
    );
  };

/**
 * Parse DB Input and return ResultAsync
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Because of accept any zod schema
export function parseDBInputAsync<T extends z.ZodObject<any> | z.ZodUnion<any> | z.ZodArray<any>>(
  input: unknown,
  schema: T
): ResultAsync<z.infer<typeof schema>, DBError> {
  return ResultAsync.fromPromise(
    (async () => {
      try {
        return schema.parse(input);
      } catch (error) {
        throw new DBError(error.message, "INTERNAL_SERVER_ERROR");
      }
    })(),
    (error) => {
      if (error instanceof DBError) {
        return error;
      } else {
        return new DBError("Parse DB input is failed", "INTERNAL_SERVER_ERROR");
      }
    }
  );
}
