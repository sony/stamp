import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import {
  CreateGroupInput,
  CreateGroupMemberNotificationInput,
  CreateGroupMemberNotificationOutput,
  CreateGroupOutput,
  DeleteGroupInput,
  DeleteGroupMemberNotificationInput,
  DeleteGroupMemberNotificationOutput,
  DeleteGroupOutput,
  GetGroupInput,
  GetGroupOutput,
  Group,
  GroupProvider,
  IdentityPluginError,
  ListGroupInput,
  ListGroupOutput,
  UpdateGroupInput,
  UpdateGroupMemberNotificationInput,
  UpdateGroupMemberNotificationOutput,
  UpdateGroupOutput,
  CreateApprovalRequestNotificationInput,
  CreateApprovalRequestNotificationOutput,
  UpdateApprovalRequestNotificationInput,
  UpdateApprovalRequestNotificationOutput,
  DeleteApprovalRequestNotificationInput,
  DeleteApprovalRequestNotificationOutput,
} from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { parseDBItemAsync } from "./utils/neverthrow";
import { serializeObject } from "./utils/pagination";

export function getImpl(logger: Logger) {
  return (input: GetGroupInput, tableName: string, config: DynamoDBClientConfig = {}): GetGroupOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
        groupId: input.groupId,
      },
    };
    const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return getResult.andThen((result) => {
      if (result.Item === undefined) {
        return okAsync(none);
      } else {
        const parsedItem = parseDBItemAsync(result.Item, Group);
        return parsedItem.map((item) => some(item));
      }
    });
  };
}

export function listImpl(logger: Logger) {
  return (input: ListGroupInput, tableName: string, config: DynamoDBClientConfig = {}): ListGroupOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const params = {
      TableName: tableName,
      FilterExpression: "begins_with(groupName,:groupName)",
      ExpressionAttributeValues: {
        ":groupName": input.groupNamePrefix ?? "",
      },
      Limit: input.limit,
    };
    const ScanResult = ResultAsync.fromPromise(ddbDocClient.send(new ScanCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return ScanResult.andThen((result) => {
      logger.info(result);
      if (result.Items === undefined) {
        return okAsync({ items: [] });
      } else {
        return parseDBItemAsync(result.Items, z.array(Group)).andThen((items) => {
          let paginationToken: string | undefined = undefined;
          if (result.LastEvaluatedKey) {
            paginationToken = serializeObject(result.LastEvaluatedKey);
          }
          return okAsync({ items: items, nextPaginationToken: paginationToken });
        });
      }
    });
  };
}

export function createImpl(logger: Logger) {
  return (input: CreateGroupInput, tableName: string, config: DynamoDBClientConfig = {}): CreateGroupOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const group: Group = {
      groupId: globalThis.crypto.randomUUID(),
      groupName: input.groupName,
      description: input.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const params = {
      TableName: tableName,
      Item: group,
      ConditionExpression: "attribute_not_exists(groupId)",
    };
    const putResult = ResultAsync.fromPromise(ddbDocClient.send(new PutCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return putResult.map(() => group);
  };
}

export function deleteImpl(logger: Logger) {
  return (input: DeleteGroupInput, tableName: string, config: DynamoDBClientConfig = {}): DeleteGroupOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
        groupId: input.groupId,
      },
    };
    const deleteResult = ResultAsync.fromPromise(ddbDocClient.send(new DeleteCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return deleteResult.map(() => undefined);
  };
}

export function updateImpl(logger: Logger) {
  return (input: UpdateGroupInput, tableName: string, config: DynamoDBClientConfig = {}): UpdateGroupOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const updateResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            groupId: input.groupId,
          },
          UpdateExpression: "set groupName=:groupName, description=:description, updatedAt=:updatedAt",
          ExpressionAttributeValues: {
            ":groupName": input.groupName,
            ":description": input.description,
            ":updatedAt": new Date().toISOString(),
          },
          ReturnValues: "ALL_NEW",
          ConditionExpression: "attribute_exists(groupId)",
        })
      ),
      (err) => {
        logger.error(err);
        return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return updateResult.andThen((result) => {
      const parsedItem = parseDBItemAsync(result.Attributes, Group);
      return parsedItem.map((item) => item);
    });
  };
}

export function createGroupMemberNotificationImpl(logger: Logger) {
  return (input: CreateGroupMemberNotificationInput, tableName: string, config: DynamoDBClientConfig = {}): CreateGroupMemberNotificationOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const updateResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            groupId: input.groupId,
          },
          ExpressionAttributeNames: {
            "#groupMemberNotifications": "groupMemberNotifications",
          },
          ExpressionAttributeValues: {
            ":emptyList": [],
            ":groupMemberNotifications": [
              {
                id: globalThis.crypto.randomUUID(),
                notificationChannel: input.notificationChannel,
              },
            ], // list_append(list1, list2) requires list format
            ":updatedAt": new Date().toISOString(),
          },
          UpdateExpression:
            "set #groupMemberNotifications=list_append(if_not_exists(#groupMemberNotifications, :emptyList), :groupMemberNotifications), updatedAt=:updatedAt",
          ReturnValues: "ALL_NEW",
          ConditionExpression: "attribute_exists(groupId)",
        })
      ),
      (err) => {
        logger.error(err);
        return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return updateResult.andThen((result) => {
      const parsedItem = parseDBItemAsync(result.Attributes, Group);
      return parsedItem.map((item) => item);
    });
  };
}

export function updateGroupMemberNotificationImpl(logger: Logger) {
  return (input: UpdateGroupMemberNotificationInput, tableName: string, config: DynamoDBClientConfig = {}): UpdateGroupMemberNotificationOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const params = {
      TableName: tableName,
      Key: {
        groupId: input.groupId,
      },
    };
    const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return getResult.andThen((result) => {
      if (result.Item === undefined) {
        return errAsync(new IdentityPluginError("Group does not exist", "BAD_REQUEST"));
      }
      return parseDBItemAsync(result.Item, Group)
        .andThen((group) => {
          logger.info(group);

          if (!group.groupMemberNotifications || group.groupMemberNotifications.length === 0) {
            return errAsync(new IdentityPluginError("Group member notifications does not exist", "BAD_REQUEST"));
          }
          const notificationIndex = group.groupMemberNotifications.findIndex((notification) => notification.id === input.notificationId);
          logger.info("notificationIndex", notificationIndex);
          if (notificationIndex < 0 || group.groupMemberNotifications.length <= notificationIndex) {
            return errAsync(new IdentityPluginError("Target group member notification does not exist", "BAD_REQUEST"));
          }

          const updateResult = ResultAsync.fromPromise(
            ddbDocClient.send(
              new UpdateCommand({
                TableName: tableName,
                Key: {
                  groupId: input.groupId,
                },
                ExpressionAttributeNames: {
                  "#groupMemberNotifications": "groupMemberNotifications",
                  "#id": "id",
                  "#notificationChannel": "notificationChannel",
                },
                ExpressionAttributeValues: {
                  ":notificationChannel": input.notificationChannel,
                  ":notificationId": input.notificationId,
                  ":updatedAt": new Date().toISOString(),
                },
                UpdateExpression: `set #groupMemberNotifications[${notificationIndex}].#notificationChannel=:notificationChannel, updatedAt=:updatedAt`,
                ReturnValues: "ALL_NEW",
                // Check id to ensure consistency of update
                ConditionExpression: `attribute_exists(groupId) and #groupMemberNotifications[${notificationIndex}].#id=:notificationId`,
              })
            ),
            (err) => {
              logger.error(err);
              return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
            }
          );

          return updateResult.andThen((result) => {
            const parsedItem = parseDBItemAsync(result.Attributes, Group);
            return parsedItem.map((item) => item);
          });
        })
        .mapErr((err) => {
          logger.error(err);
          return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        });
    });
  };
}

export function deleteGroupMemberNotificationImpl(logger: Logger) {
  return (input: DeleteGroupMemberNotificationInput, tableName: string, config: DynamoDBClientConfig = {}): DeleteGroupMemberNotificationOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const params = {
      TableName: tableName,
      Key: {
        groupId: input.groupId,
      },
    };
    const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return getResult.andThen((result) => {
      if (result.Item === undefined) {
        return errAsync(new IdentityPluginError("Group does not exist", "BAD_REQUEST"));
      }
      return parseDBItemAsync(result.Item, Group)
        .andThen((group) => {
          logger.info(group);

          if (!group.groupMemberNotifications || group.groupMemberNotifications.length === 0) {
            return errAsync(new IdentityPluginError("Group member notifications does not exist", "BAD_REQUEST"));
          }
          const notificationIndex = group.groupMemberNotifications.findIndex((notification) => notification.id === input.notificationId);
          logger.info("notificationIndex", notificationIndex);
          if (notificationIndex < 0 || group.groupMemberNotifications.length <= notificationIndex) {
            return errAsync(new IdentityPluginError("Target group member notification does not exist", "BAD_REQUEST"));
          }

          const updateResult = ResultAsync.fromPromise(
            ddbDocClient.send(
              new UpdateCommand({
                TableName: tableName,
                Key: {
                  groupId: input.groupId,
                },
                ExpressionAttributeNames: {
                  "#groupMemberNotifications": "groupMemberNotifications",
                  "#id": "id",
                },
                ExpressionAttributeValues: {
                  ":notificationId": input.notificationId,
                  ":updatedAt": new Date().toISOString(),
                },
                UpdateExpression: `set updatedAt=:updatedAt remove #groupMemberNotifications[${notificationIndex}]`,
                ReturnValues: "ALL_NEW",
                // Check id to ensure consistency of delete
                ConditionExpression: `attribute_exists(groupId) and #groupMemberNotifications[${notificationIndex}].#id=:notificationId`,
              })
            ),
            (err) => {
              logger.error(err);
              return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
            }
          );

          return updateResult.andThen((result) => {
            const parsedItem = parseDBItemAsync(result.Attributes, Group);
            return parsedItem.map((item) => item);
          });
        })
        .mapErr((err) => {
          logger.error(err);
          return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        });
    });
  };
}

export function createApprovalRequestNotificationImpl(logger: Logger) {
  return (input: CreateApprovalRequestNotificationInput, tableName: string, config: DynamoDBClientConfig = {}): CreateApprovalRequestNotificationOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const updateResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            groupId: input.groupId,
          },
          ExpressionAttributeNames: {
            "#approvalRequestNotifications": "approvalRequestNotifications",
          },
          ExpressionAttributeValues: {
            ":emptyList": [],
            ":approvalRequestNotifications": [
              {
                id: globalThis.crypto.randomUUID(),
                notificationChannel: input.notificationChannel,
              },
            ],
            ":updatedAt": new Date().toISOString(),
          },
          UpdateExpression:
            "set #approvalRequestNotifications=list_append(if_not_exists(#approvalRequestNotifications, :emptyList), :approvalRequestNotifications), updatedAt=:updatedAt",
          ReturnValues: "ALL_NEW",
          ConditionExpression: "attribute_exists(groupId)",
        })
      ),
      (err) => {
        logger.error(err);
        return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return updateResult.andThen((result) => {
      const parsedItem = parseDBItemAsync(result.Attributes, Group);
      return parsedItem.map((item) => item);
    });
  };
}

export function updateApprovalRequestNotificationImpl(logger: Logger) {
  return (input: UpdateApprovalRequestNotificationInput, tableName: string, config: DynamoDBClientConfig = {}): UpdateApprovalRequestNotificationOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const params = {
      TableName: tableName,
      Key: {
        groupId: input.groupId,
      },
    };
    const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return getResult.andThen((result) => {
      if (result.Item === undefined) {
        return errAsync(new IdentityPluginError("Group does not exist", "BAD_REQUEST"));
      }
      return parseDBItemAsync(result.Item, Group)
        .andThen((group) => {
          logger.info(group);

          if (!group.approvalRequestNotifications || group.approvalRequestNotifications.length === 0) {
            return errAsync(new IdentityPluginError("Approval request notifications do not exist", "BAD_REQUEST"));
          }
          const notificationIndex = group.approvalRequestNotifications.findIndex((notification) => notification.id === input.notificationId);
          logger.info("notificationIndex", notificationIndex);
          if (notificationIndex < 0 || group.approvalRequestNotifications.length <= notificationIndex) {
            return errAsync(new IdentityPluginError("Target approval request notification does not exist", "BAD_REQUEST"));
          }

          const updateResult = ResultAsync.fromPromise(
            ddbDocClient.send(
              new UpdateCommand({
                TableName: tableName,
                Key: {
                  groupId: input.groupId,
                },
                ExpressionAttributeNames: {
                  "#approvalRequestNotifications": "approvalRequestNotifications",
                  "#id": "id",
                  "#notificationChannel": "notificationChannel",
                },
                ExpressionAttributeValues: {
                  ":notificationChannel": input.notificationChannel,
                  ":notificationId": input.notificationId,
                  ":updatedAt": new Date().toISOString(),
                },
                UpdateExpression: `set #approvalRequestNotifications[${notificationIndex}].#notificationChannel=:notificationChannel, updatedAt=:updatedAt`,
                ReturnValues: "ALL_NEW",
                ConditionExpression: `attribute_exists(groupId) and #approvalRequestNotifications[${notificationIndex}].#id=:notificationId`,
              })
            ),
            (err) => {
              logger.error(err);
              return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
            }
          );

          return updateResult.andThen((result) => {
            const parsedItem = parseDBItemAsync(result.Attributes, Group);
            return parsedItem.map((item) => item);
          });
        })
        .mapErr((err) => {
          logger.error(err);
          return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        });
    });
  };
}

export function deleteApprovalRequestNotificationImpl(logger: Logger) {
  return (input: DeleteApprovalRequestNotificationInput, tableName: string, config: DynamoDBClientConfig = {}): DeleteApprovalRequestNotificationOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const params = {
      TableName: tableName,
      Key: {
        groupId: input.groupId,
      },
    };
    const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return getResult.andThen((result) => {
      if (result.Item === undefined) {
        return errAsync(new IdentityPluginError("Group does not exist", "BAD_REQUEST"));
      }
      return parseDBItemAsync(result.Item, Group)
        .andThen((group) => {
          logger.info(group);

          if (!group.approvalRequestNotifications || group.approvalRequestNotifications.length === 0) {
            return errAsync(new IdentityPluginError("Approval request notifications do not exist", "BAD_REQUEST"));
          }
          const notificationIndex = group.approvalRequestNotifications.findIndex((notification) => notification.id === input.notificationId);
          logger.info("notificationIndex", notificationIndex);
          if (notificationIndex < 0 || group.approvalRequestNotifications.length <= notificationIndex) {
            return errAsync(new IdentityPluginError("Target approval request notification does not exist", "BAD_REQUEST"));
          }

          const updateResult = ResultAsync.fromPromise(
            ddbDocClient.send(
              new UpdateCommand({
                TableName: tableName,
                Key: {
                  groupId: input.groupId,
                },
                ExpressionAttributeNames: {
                  "#approvalRequestNotifications": "approvalRequestNotifications",
                  "#id": "id",
                },
                ExpressionAttributeValues: {
                  ":notificationId": input.notificationId,
                  ":updatedAt": new Date().toISOString(),
                },
                UpdateExpression: `set updatedAt=:updatedAt remove #approvalRequestNotifications[${notificationIndex}]`,
                ReturnValues: "ALL_NEW",
                ConditionExpression: `attribute_exists(groupId) and #approvalRequestNotifications[${notificationIndex}].#id=:notificationId`,
              })
            ),
            (err) => {
              logger.error(err);
              return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
            }
          );

          return updateResult.andThen((result) => {
            const parsedItem = parseDBItemAsync(result.Attributes, Group);
            return parsedItem.map((item) => item);
          });
        })
        .mapErr((err) => {
          logger.error(err);
          return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        });
    });
  };
}

export function createGroupProvider(logger: Logger) {
  return (tableName: string, config: DynamoDBClientConfig = {}): GroupProvider => {
    return {
      get: function (input): GetGroupOutput {
        return getImpl(logger)(input, tableName, config);
      },
      list: function (input): ListGroupOutput {
        return listImpl(logger)(input, tableName, config);
      },
      create: function (input): CreateGroupOutput {
        return createImpl(logger)(input, tableName, config);
      },
      delete: function (input): DeleteGroupOutput {
        return deleteImpl(logger)(input, tableName, config);
      },
      update: function (input): UpdateGroupOutput {
        return updateImpl(logger)(input, tableName, config);
      },
      createGroupMemberNotification: function (input): CreateGroupMemberNotificationOutput {
        return createGroupMemberNotificationImpl(logger)(input, tableName, config);
      },
      updateGroupMemberNotification: function (input): UpdateGroupMemberNotificationOutput {
        return updateGroupMemberNotificationImpl(logger)(input, tableName, config);
      },
      deleteGroupMemberNotification: function (input): DeleteGroupMemberNotificationOutput {
        return deleteGroupMemberNotificationImpl(logger)(input, tableName, config);
      },
      createApprovalRequestNotification: function (input): CreateApprovalRequestNotificationOutput {
        return createApprovalRequestNotificationImpl(logger)(input, tableName, config);
      },
      updateApprovalRequestNotification: function (input): UpdateApprovalRequestNotificationOutput {
        return updateApprovalRequestNotificationImpl(logger)(input, tableName, config);
      },
      deleteApprovalRequestNotification: function (input): DeleteApprovalRequestNotificationOutput {
        return deleteApprovalRequestNotificationImpl(logger)(input, tableName, config);
      },
    };
  };
}
