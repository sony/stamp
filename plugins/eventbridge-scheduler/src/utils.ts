import { ResultAsync } from "neverthrow";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { z } from "zod";

/**
 * Parse DB item and return ResultAsync
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Because of accept any zod schema
export function parseDBItemAsync<T extends z.ZodObject<any> | z.ZodUnion<any> | z.ZodArray<any>>(
  input: unknown,
  schema: T
): ResultAsync<z.infer<typeof schema>, SchedulerError> {
  return ResultAsync.fromPromise(
    (async () => {
      try {
        return schema.parse(input);
      } catch (error) {
        throw new SchedulerError(error.message);
      }
    })(),
    (error) => {
      if (error instanceof SchedulerError) {
        return error;
      } else {
        return new SchedulerError("Parse DB item is failed");
      }
    }
  );
}
