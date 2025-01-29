import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync } from "neverthrow";
import { listPermissionInfoByAccountId } from "../../events/permissionInfo/listPermissionInfo";
import { listAuditItemsByGroupId } from "../../events/group/listAuditItemsByGroupId";
import { Logger } from "@stamp-lib/stamp-logger";

export interface AuditItem {
  name: string;
  values: string[];
}

export interface ListAuditItemOutput {
  items: Array<AuditItem>;
  nextToken?: string;
}

type Config = { region: string; identityInstanceArn: string; identityStoreId: string; permissionTableName: string };
type GetListOfAuditItemInput = { accountId: string; limit?: number; nextToken?: string };
type GetListOfAuditItem = (input: GetListOfAuditItemInput) => ResultAsync<ListAuditItemOutput, HandlerError>;

export const listAuditItem =
  (logger: Logger, config: Config): GetListOfAuditItem =>
  (input) => {
    return listPermissionInfoByAccountId(logger, config.permissionTableName, { region: config.region })({
      awsAccountId: input.accountId,
      limit: input.limit,
      nextToken: input.nextToken,
    }).andThen((listPermissionInfoResult) => {
      const listAuditItemsByGroupIdFunc = listAuditItemsByGroupId(logger, config);
      const listAuditItems = listPermissionInfoResult.items.map((item) =>
        listAuditItemsByGroupIdFunc({ groupId: item.groupId }).map((listAuditItems) => ({
          name: item.name,
          values: listAuditItems.AuditItems.map((item) => item.name),
        }))
      );

      return ResultAsync.combine(listAuditItems).map((items) => ({ items: items, nextToken: listPermissionInfoResult.nextToken }));
    });
  };
