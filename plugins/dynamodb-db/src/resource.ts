import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import {
  CreateAuditNotificationInput,
  CreateAuditNotificationOutput,
  DBError,
  DeleteAuditNotificationInput,
  DeleteAuditNotificationOutput,
  ResourceDBDeleteResult,
  ResourceDBGetByIdResult,
  ResourceDBProvider,
  ResourceDBSetResult,
  ResourceInput,
  UpdateAuditNotificationInput,
  UpdateAuditNotificationOutput,
  UpdatePendingUpdateParamsInput,
} from "@stamp-lib/stamp-types/pluginInterface/database";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { parseDBInputAsync, parseDBItemAsync } from "./utils/neverthrow";

export function getByIdImpl(logger: Logger) {
  return (input: ResourceInput, TableName: string, config: DynamoDBClientConfig = {}): ResourceDBGetByIdResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    return parseDBInputAsync(input, ResourceInput).andThen((resourceKey) => {
      const compositeKey = `${resourceKey.catalogId}#${resourceKey.resourceTypeId}`;

      const getResult = ResultAsync.fromPromise(
        ddbDocClient.send(
          new GetCommand({
            TableName: TableName,
            Key: {
              id: resourceKey.id,
              "catalogId#resourceTypeId": compositeKey,
            },
          })
        ),
        (err) => {
          logger.error(err);
          return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        }
      );

      return getResult.andThen((result) => {
        if (result.Item === undefined) {
          return okAsync(none);
        } else {
          const parsedItemResult = parseDBItemAsync(logger)(result.Item, ResourceOnDB);
          return parsedItemResult.map((item) => some(item));
        }
      });
    });
  };
}

export function setImpl(logger: Logger) {
  return (resourceOnDB: ResourceOnDB, TableName: string, config: DynamoDBClientConfig = {}): ResourceDBSetResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    return parseDBInputAsync(resourceOnDB, ResourceOnDB).andThen((resourceOnDB) => {
      const compositeKey = `${resourceOnDB.catalogId}#${resourceOnDB.resourceTypeId}`;
      const putResult = ResultAsync.fromPromise(
        ddbDocClient.send(
          new PutCommand({
            TableName: TableName,
            Item: {
              ...resourceOnDB,
              "catalogId#resourceTypeId": compositeKey,
            },
          })
        ),
        (err) => {
          logger.error(err);
          return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        }
      );

      return putResult.andThen(() => okAsync(resourceOnDB));
    });
  };
}

export function updatePendingUpdateParamsImpl(logger: Logger) {
  return (input: UpdatePendingUpdateParamsInput, TableName: string, config: DynamoDBClientConfig = {}): ResourceDBSetResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    return parseDBInputAsync(input, UpdatePendingUpdateParamsInput).andThen((resourceKey) => {
      const compositeKey = `${resourceKey.catalogId}#${resourceKey.resourceTypeId}`;
      const pendingUpdate = resourceKey.pendingUpdateParams;
      const updateResult = ResultAsync.fromPromise(
        ddbDocClient.send(
          new UpdateCommand({
            TableName: TableName,
            Key: {
              id: resourceKey.id,
              "catalogId#resourceTypeId": compositeKey,
            },
            // If pendingUpdate is undefined, remove the attribute; otherwise, set it
            ...(pendingUpdate === undefined
              ? {
                  UpdateExpression: "REMOVE pendingUpdate",
                  ConditionExpression: "attribute_exists(id) and attribute_exists(#catalogIdResourceTypeId)",
                  ExpressionAttributeNames: {
                    "#catalogIdResourceTypeId": "catalogId#resourceTypeId",
                  },
                }
              : {
                  UpdateExpression: "set pendingUpdate = :pendingUpdate",
                  ExpressionAttributeValues: {
                    ":pendingUpdate": pendingUpdate,
                  },
                  ConditionExpression: "attribute_exists(id) and attribute_exists(#catalogIdResourceTypeId)",
                  ExpressionAttributeNames: {
                    "#catalogIdResourceTypeId": "catalogId#resourceTypeId",
                  },
                }),

            ReturnValues: "ALL_NEW",
          })
        ),
        (err) => {
          logger.error(err);
          return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        }
      );

      return updateResult.andThen((result) => {
        const parsedItem = parseDBItemAsync(logger)(result.Attributes, ResourceOnDB);
        return parsedItem.map((item) => item);
      });
    });
  };
}

export function deleteImpl(logger: Logger) {
  return (input: ResourceInput, TableName: string, config: DynamoDBClientConfig = {}): ResourceDBDeleteResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    return parseDBInputAsync(input, ResourceInput).andThen((resourceKey) => {
      const compositeKey = `${resourceKey.catalogId}#${resourceKey.resourceTypeId}`;

      const deleteResult = ResultAsync.fromPromise(
        ddbDocClient.send(
          new DeleteCommand({
            TableName: TableName,
            Key: {
              id: resourceKey.id,
              "catalogId#resourceTypeId": compositeKey,
            },
          })
        ),
        (err) => {
          logger.error(err);
          return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        }
      );

      return deleteResult.andThen(() => okAsync(undefined));
    });
  };
}

export function createAuditNotificationImpl(logger: Logger) {
  return (input: CreateAuditNotificationInput, TableName: string, config: DynamoDBClientConfig = {}): CreateAuditNotificationOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    return parseDBInputAsync(input, CreateAuditNotificationInput).andThen((resourceOnDB) => {
      const compositeKey = `${resourceOnDB.catalogId}#${resourceOnDB.resourceTypeId}`;

      // add audit notification to list
      const putResult = ResultAsync.fromPromise(
        ddbDocClient.send(
          new UpdateCommand({
            TableName: TableName,
            Key: {
              "catalogId#resourceTypeId": compositeKey,
              id: resourceOnDB.id,
            },
            ExpressionAttributeNames: {
              "#auditNotifications": "auditNotifications",
              "#catalogIdResourceTypeId": "catalogId#resourceTypeId",
            },
            ExpressionAttributeValues: {
              ":emptyList": [],
              ":auditNotifications": [
                {
                  id: globalThis.crypto.randomUUID(),
                  cronExpression: input.cronExpression,
                  schedulerEventId: input.schedulerEventId,
                  notificationChannel: input.notificationChannel,
                },
              ], // list_append(list1, list2) requires list format
            },
            UpdateExpression: "set #auditNotifications=list_append(if_not_exists(#auditNotifications, :emptyList), :auditNotifications)",
            ReturnValues: "ALL_NEW",
            ConditionExpression: "attribute_exists(#catalogIdResourceTypeId) and attribute_exists(id)",
          })
        ),
        (err) => {
          logger.error(err);
          return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        }
      );

      return putResult.andThen((result) => {
        const parsedItem = parseDBItemAsync(logger)(result.Attributes, ResourceOnDB);
        return parsedItem.map((item) => item);
      });
    });
  };
}

export function updateAuditNotificationImpl(logger: Logger) {
  return (input: UpdateAuditNotificationInput, tableName: string, config: DynamoDBClientConfig = {}): UpdateAuditNotificationOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    return parseDBInputAsync(input, UpdateAuditNotificationInput).andThen((resourceOnDB) => {
      const compositeKey = `${resourceOnDB.catalogId}#${resourceOnDB.resourceTypeId}`;

      const params = {
        TableName: tableName,
        Key: {
          id: resourceOnDB.id,
          "catalogId#resourceTypeId": compositeKey,
        },
      };
      const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand(params)), (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      });
      return getResult.andThen((result) => {
        if (result.Item === undefined) {
          return errAsync(new DBError("Resource does not exist", "BAD_REQUEST"));
        }
        return parseDBItemAsync(logger)(result.Item, ResourceOnDB)
          .andThen((resource) => {
            logger.info(resource);

            if (!resource.auditNotifications || resource.auditNotifications.length === 0) {
              return errAsync(new DBError("Audit Resource notifications does not exist", "BAD_REQUEST"));
            }
            // get index of audit notification that matches auditNotificationId in the argument
            const notificationIndex = resource.auditNotifications.findIndex((notification) => notification.id === input.auditNotificationId);
            logger.info("notificationIndex", notificationIndex);
            if (notificationIndex < 0 || resource.auditNotifications.length <= notificationIndex) {
              return errAsync(new DBError("Target audit resource notification does not exist", "BAD_REQUEST"));
            }

            // update audit notification for target index
            const updateResult = ResultAsync.fromPromise(
              ddbDocClient.send(
                new UpdateCommand({
                  TableName: tableName,
                  Key: {
                    "catalogId#resourceTypeId": compositeKey,
                    id: resourceOnDB.id,
                  },
                  ExpressionAttributeNames: {
                    "#auditNotifications": "auditNotifications",
                    "#id": "id",
                    "#notificationChannel": "notificationChannel",
                    "#schedulerEventId": "schedulerEventId",
                    "#cronExpression": "cronExpression",
                    "#catalogIdResourceTypeId": "catalogId#resourceTypeId",
                  },
                  ExpressionAttributeValues: {
                    ":notificationChannel": input.notificationChannel,
                    ":schedulerEventId": input.schedulerEventId,
                    ":cronExpression": input.cronExpression,
                    ":notificationId": input.auditNotificationId,
                  },
                  UpdateExpression: `set #auditNotifications[${notificationIndex}].#notificationChannel=:notificationChannel, #auditNotifications[${notificationIndex}].#schedulerEventId=:schedulerEventId, #auditNotifications[${notificationIndex}].#cronExpression=:cronExpression`,
                  ReturnValues: "ALL_NEW",
                  // Check id to ensure consistency of update
                  ConditionExpression: `attribute_exists(#catalogIdResourceTypeId) and attribute_exists(id) and #auditNotifications[${notificationIndex}].#id=:notificationId`,
                })
              ),
              (err) => {
                logger.error(err);
                return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
              }
            );

            return updateResult.andThen((result) => {
              const parsedItem = parseDBItemAsync(logger)(result.Attributes, ResourceOnDB);
              return parsedItem.map((item) => item);
            });
          })
          .mapErr((err) => {
            logger.error(err);
            return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
          });
      });
    });
  };
}

export function deleteAuditNotificationImpl(logger: Logger) {
  return (input: DeleteAuditNotificationInput, tableName: string, config: DynamoDBClientConfig = {}): DeleteAuditNotificationOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    return parseDBInputAsync(input, DeleteAuditNotificationInput).andThen((resourceOnDB) => {
      const compositeKey = `${resourceOnDB.catalogId}#${resourceOnDB.resourceTypeId}`;

      const params = {
        TableName: tableName,
        Key: {
          id: resourceOnDB.id,
          "catalogId#resourceTypeId": compositeKey,
        },
      };
      const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand(params)), (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      });

      return getResult.andThen((result) => {
        if (result.Item === undefined) {
          return errAsync(new DBError("Group does not exist", "BAD_REQUEST"));
        }
        return parseDBItemAsync(logger)(result.Item, ResourceOnDB)
          .andThen((resource) => {
            logger.info(resource);

            if (!resource.auditNotifications || resource.auditNotifications.length === 0) {
              return errAsync(new DBError("Group member notifications does not exist", "BAD_REQUEST"));
            }
            // get index of audit notification that matches auditNotificationId in the argument
            const notificationIndex = resource.auditNotifications.findIndex((notification) => notification.id === input.auditNotificationId);
            logger.info("notificationIndex", notificationIndex);
            if (notificationIndex < 0 || resource.auditNotifications.length <= notificationIndex) {
              return errAsync(new DBError("Target group member notification does not exist", "BAD_REQUEST"));
            }

            // delete audit notification for target index
            const updateResult = ResultAsync.fromPromise(
              ddbDocClient.send(
                new UpdateCommand({
                  TableName: tableName,
                  Key: {
                    "catalogId#resourceTypeId": compositeKey,
                    id: resourceOnDB.id,
                  },
                  ExpressionAttributeNames: {
                    "#auditNotifications": "auditNotifications",
                    "#id": "id",
                    "#catalogIdResourceTypeId": "catalogId#resourceTypeId",
                  },
                  ExpressionAttributeValues: {
                    ":notificationId": input.auditNotificationId,
                  },
                  UpdateExpression: `remove #auditNotifications[${notificationIndex}]`,
                  ReturnValues: "ALL_NEW",
                  // Check id to ensure consistency of delete
                  ConditionExpression: `attribute_exists(#catalogIdResourceTypeId) and attribute_exists(id) and #auditNotifications[${notificationIndex}].#id=:notificationId`,
                })
              ),
              (err) => {
                logger.error(err);
                return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
              }
            );

            return updateResult.andThen((result) => {
              const parsedItem = parseDBItemAsync(logger)(result.Attributes, ResourceOnDB);
              return parsedItem.map((item) => item);
            });
          })
          .mapErr((err) => {
            logger.error(err);
            return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
          });
      });
    });
  };
}

export const createResourceDBProvider =
  (logger: Logger) =>
  (TableName: string, config: DynamoDBClientConfig = {}): ResourceDBProvider => {
    return {
      getById: (input: ResourceInput) => getByIdImpl(logger)(input, TableName, config),
      set: (resourceOnDB: ResourceOnDB) => setImpl(logger)(resourceOnDB, TableName, config),
      updatePendingUpdateParams: (input: UpdatePendingUpdateParamsInput) => updatePendingUpdateParamsImpl(logger)(input, TableName, config),
      delete: (input: ResourceInput) => deleteImpl(logger)(input, TableName, config),
      createAuditNotification: (input: CreateAuditNotificationInput) => createAuditNotificationImpl(logger)(input, TableName, config),
      updateAuditNotification: (input: UpdateAuditNotificationInput) => updateAuditNotificationImpl(logger)(input, TableName, config),
      deleteAuditNotification: (input: DeleteAuditNotificationInput) => deleteAuditNotificationImpl(logger)(input, TableName, config),
    };
  };
