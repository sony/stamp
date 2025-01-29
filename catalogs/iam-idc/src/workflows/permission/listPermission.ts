import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync } from "neverthrow";
import { ListPermissionInfoResult } from "../../types/permission";
import { listPermissionInfo, listPermissionInfoByAccountId } from "../../events/permissionInfo/listPermissionInfo";
import z from "zod";
import { Logger } from "@stamp-lib/stamp-logger";

type Config = { region: string; permissionTableName: string };
export const ListPermissionInput = z.object({
  awsAccountId: z.string().optional(),
  namePrefix: z.string().optional(),
  nextToken: z.string().optional(),
  limit: z.number().optional(),
});
export type ListPermissionInput = z.infer<typeof ListPermissionInput>;
export type ListPermission = (input: ListPermissionInput) => ResultAsync<ListPermissionInfoResult, HandlerError>;

export const listPermission =
  (logger: Logger, config: Config): ListPermission =>
  (input) => {
    const parsedResult = ListPermissionInput.safeParse(input);
    if (!parsedResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
    }
    return (() => {
      const awsAccountId = parsedResult.data.awsAccountId;
      if (awsAccountId) {
        return listPermissionInfoByAccountId(logger, config.permissionTableName, { region: config.region })({
          ...parsedResult.data,
          awsAccountId,
        });
      } else {
        return listPermissionInfo(logger, config.permissionTableName, { region: config.region })(parsedResult.data);
      }
    })();
  };
