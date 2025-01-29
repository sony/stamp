import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { IdentitystoreClient, ListGroupMembershipsCommand, DescribeUserCommand, GroupMembership } from "@aws-sdk/client-identitystore";
import { Logger } from "@stamp-lib/stamp-logger";
type Config = { region: string; identityStoreId: string };
export interface AuditItem {
  identityStoreId: string;
  groupId: string;
  userId: string;
  name: string;
}
export type ListAuditItemsByGroupIdInput = { groupId: string; nextToken?: string; limit?: number };
export interface ListAuditItemsByGroupIdOutput {
  AuditItems: Array<AuditItem>;
  nextToken: string | undefined;
}

type ListAuditItemsByGroupId = <T extends ListAuditItemsByGroupIdInput>(input: T) => ResultAsync<ListAuditItemsByGroupIdOutput, HandlerError>;

export const listAuditItemsByGroupId =
  (logger: Logger, config: Config): ListAuditItemsByGroupId =>
  (input) => {
    return listGroupMemberships(logger, {
      region: config.region,
      identityStoreId: config.identityStoreId,
      groupId: input.groupId,
      nextToken: input.nextToken,
      limit: input.limit,
    }).andThen((listGroupMembershipsResult) =>
      describeGroupMemberships(logger, listGroupMembershipsResult).andThen((describedResult) => {
        return ok({
          AuditItems: describedResult.auditItemPermissionSetItem,
          nextToken: listGroupMembershipsResult.nextToken,
        });
      })
    );
  };

type ListGroupMembershipsInput = { region: string; identityStoreId: string; groupId: string; nextToken?: string; limit?: number };
type ListGroupMembershipsOutput = { region: string; identityStoreId: string; groupId: string; groupMemberships: Array<GroupMembership>; nextToken?: string };
const listGroupMemberships = (
  logger: Logger,
  { region, identityStoreId, groupId, nextToken, limit }: ListGroupMembershipsInput
): ResultAsync<ListGroupMembershipsOutput, HandlerError> => {
  const client = new IdentitystoreClient({ region: region });
  const command = new ListGroupMembershipsCommand({
    IdentityStoreId: identityStoreId,
    GroupId: groupId,
    NextToken: nextToken,
    MaxResults: limit,
  });
  return ResultAsync.fromPromise(client.send(command), (e) => {
    const message = `Failed to list group memberships: ${e}`;
    logger.error(message);
    return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
  }).andThen((result) => {
    return ok({
      identityStoreId: identityStoreId,
      groupId: groupId,
      region: region,
      groupMemberships: result.GroupMemberships || [],
      nextToken: result.NextToken,
    });
  });
};

type DescribeGroupMembershipsInput = { region: string; identityStoreId: string; groupId: string; groupMemberships: Array<GroupMembership> };
type DescribeGroupMembershipsOutput = { identityStoreId: string; groupId: string; auditItemPermissionSetItem: Array<AuditItem> };
const describeGroupMemberships = (
  logger: Logger,
  { region, identityStoreId, groupId, groupMemberships }: DescribeGroupMembershipsInput
): ResultAsync<DescribeGroupMembershipsOutput, HandlerError> => {
  const client = new IdentitystoreClient({ region: region });
  const promises = groupMemberships.map((membership) => {
    if (!membership.MemberId) {
      throw new HandlerError(`MemberId is empty`, "INTERNAL_SERVER_ERROR");
    }
    const describeCommand = new DescribeUserCommand({
      IdentityStoreId: identityStoreId,
      UserId: membership.MemberId.UserId,
    });
    return client.send(describeCommand);
  });

  return ResultAsync.fromPromise(
    Promise.all(promises).then((describeResults) => {
      const Items: AuditItem[] = [];
      for (const describeResult of describeResults) {
        if (describeResult.UserId) {
          Items.push({
            identityStoreId: identityStoreId,
            groupId: groupId,
            userId: describeResult.UserId,
            name: describeResult.UserName || "",
          });
        }
      }
      return {
        identityStoreId: identityStoreId,
        groupId: groupId,
        auditItemPermissionSetItem: Items,
      };
    }),
    (e) => {
      const message = `Failed to describe group memberships: ${e}`;
      logger.error(message);
      return new HandlerError(message, "INTERNAL_SERVER_ERROR");
    }
  );
};
