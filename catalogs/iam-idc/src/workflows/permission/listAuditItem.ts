import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync } from "neverthrow";

import { listAuditItemsByGroupId } from "../../events/group/listAuditItemsByGroupId";
import { getPermissionInfo } from "../../events/permissionInfo/getPermissionInfo";
import z from "zod";
import { Logger } from "@stamp-lib/stamp-logger";

type Config = { region: string; permissionTableName: string; identityStoreId: string };
export const ListOfAuditItemInput = z.object({
  permissionId: z.string(),
  nextToken: z.string().optional(),
  limit: z.number().optional(),
});
export type ListOfAuditItemInput = z.infer<typeof ListOfAuditItemInput>;

export const ListOfAuditItemOutput = z.object({
  name: z.string(),
  values: z.array(z.string()),
  nextToken: z.string().optional(),
});
export type ListOfAuditItemOutput = z.infer<typeof ListOfAuditItemOutput>;

export type ListOfAuditItem = (input: ListOfAuditItemInput) => ResultAsync<ListOfAuditItemOutput, HandlerError>;

export const listOfAuditItem =
  (logger: Logger, config: Config): ListOfAuditItem =>
  (input) => {
    const listAuditItemsByGroupIdFunc = listAuditItemsByGroupId(logger, config);
    return getPermissionInfo(logger, config.permissionTableName, { region: config.region })(input).andThen((permissionInfo) => {
      if (permissionInfo.isNone()) {
        const message = `Permission ${input.permissionId} is not found`;
        return errAsync(new HandlerError(message, "NOT_FOUND", message));
      }
      return listAuditItemsByGroupIdFunc({
        groupId: permissionInfo.value.groupId,
        nextToken: input.nextToken,
        limit: input.limit,
      }).map((listAuditItems) => {
        return {
          name: permissionInfo.value.name,
          values: listAuditItems.AuditItems.map((item) => item.name),
          nextToken: listAuditItems.nextToken,
        };
      });
    });
  };
