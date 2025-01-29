import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import {
  CountGroupMemberShipInput,
  CountGroupMemberShipOutput,
  CreateGroupMemberShipInput,
  CreateGroupMemberShipOutput,
  DeleteGroupMemberShipInput,
  DeleteGroupMemberShipOutput,
  GetGroupMemberShipInput,
  GetGroupMemberShipOutput,
  GroupMemberShip,
  GroupMemberShipProvider,
  IdentityPluginError,
  ListGroupMemberShipByGroupInput,
  ListGroupMemberShipByGroupOutput,
  ListGroupMemberShipByUserInput,
  ListGroupMemberShipByUserOutput,
  UpdateGroupMemberShipInput,
  UpdateGroupMemberShipOutput,
} from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { parseDBItemAsync } from "./utils/neverthrow";
import { deserializeObject, serializeObject } from "./utils/pagination";

export function getImpl(logger: Logger) {
  return (input: GetGroupMemberShipInput, tableName: string, config: DynamoDBClientConfig = {}): GetGroupMemberShipOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
        groupId: input.groupId,
        userId: input.userId,
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
        const parsedItem = parseDBItemAsync(result.Item, GroupMemberShip);
        return parsedItem.map((item) => some(item));
      }
    });
  };
}

export function listByGroupImpl(logger: Logger) {
  return (input: ListGroupMemberShipByGroupInput, tableName: string, config: DynamoDBClientConfig = {}): ListGroupMemberShipByGroupOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ExclusiveStartKey: Record<string, any> | undefined = undefined;
    if (input.paginationToken) {
      ExclusiveStartKey = deserializeObject(input.paginationToken);
    }

    const params = {
      TableName: tableName,
      KeyConditionExpression: "groupId = :groupId",
      ExpressionAttributeValues: {
        ":groupId": input.groupId,
      },
      Limit: input.limit,
      ExclusiveStartKey: ExclusiveStartKey,
    };

    const queryResult = ResultAsync.fromPromise(ddbDocClient.send(new QueryCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return queryResult.andThen((result) => {
      logger.info(result);
      if (result.Items === undefined) {
        return okAsync({ items: [] });
      } else {
        return parseDBItemAsync(result.Items, z.array(GroupMemberShip)).andThen((items) => {
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

export function listByUserImpl(logger: Logger) {
  return (input: ListGroupMemberShipByUserInput, tableName: string, config: DynamoDBClientConfig = {}): ListGroupMemberShipByUserOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ExclusiveStartKey: Record<string, any> | undefined = undefined;
    if (input.paginationToken) {
      ExclusiveStartKey = deserializeObject(input.paginationToken);
    }

    const params = {
      TableName: tableName,
      IndexName: "userId_index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": input.userId,
      },
      Limit: input.limit,
      ExclusiveStartKey: ExclusiveStartKey,
    };

    const queryResult = ResultAsync.fromPromise(ddbDocClient.send(new QueryCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return queryResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync({ items: [] });
      } else {
        return parseDBItemAsync(result.Items, z.array(GroupMemberShip)).andThen((items) => {
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
  return (input: CreateGroupMemberShipInput, tableName: string, config: DynamoDBClientConfig = {}): CreateGroupMemberShipOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const groupMemberShip: GroupMemberShip = {
      groupId: input.groupId,
      userId: input.userId,
      role: input.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const params = {
      TableName: tableName,
      Item: groupMemberShip,
      ConditionExpression: "attribute_not_exists(groupId) AND attribute_not_exists(userId)",
    };
    const putResult = ResultAsync.fromPromise(ddbDocClient.send(new PutCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return putResult.andThen(() => {
      return okAsync(groupMemberShip);
    });
  };
}

export function deleteImpl(logger: Logger) {
  return (input: DeleteGroupMemberShipInput, tableName: string, config: DynamoDBClientConfig = {}): DeleteGroupMemberShipOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
        groupId: input.groupId,
        userId: input.userId,
      },
    };
    const deleteResult = ResultAsync.fromPromise(ddbDocClient.send(new DeleteCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return deleteResult.andThen(() => {
      return okAsync(undefined);
    });
  };
}

export function updateImpl(logger: Logger) {
  return (input: UpdateGroupMemberShipInput, tableName: string, config: DynamoDBClientConfig = {}): UpdateGroupMemberShipOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const updateResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            groupId: input.groupId,
            userId: input.userId,
          },
          UpdateExpression: "set #rl = :role, updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#rl": "role",
          },
          ExpressionAttributeValues: {
            ":role": input.role,
            ":updatedAt": new Date().toISOString(),
          },
          ReturnValues: "ALL_NEW",
          ConditionExpression: "attribute_exists(groupId) AND attribute_exists(userId)",
        })
      ),
      (err) => {
        logger.error(err);
        return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return updateResult.andThen((request) => {
      return parseDBItemAsync(request.Attributes, GroupMemberShip);
    });
  };
}

export function countImpl(logger: Logger) {
  return (input: CountGroupMemberShipInput, tableName: string, config: DynamoDBClientConfig = {}): CountGroupMemberShipOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const queryResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "groupId = :groupId",
          ExpressionAttributeValues: {
            ":groupId": input.groupId,
          },
          Select: "COUNT",
        })
      ),
      (err) => {
        logger.error(err);
        return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return queryResult.andThen((result) => {
      if (result.Count === undefined) {
        return okAsync(0);
      } else {
        return okAsync(result.Count);
      }
    });
  };
}

export function createGroupMemberShipProvider(logger: Logger) {
  return (tableName: string, config: DynamoDBClientConfig = {}): GroupMemberShipProvider => {
    return {
      get: (input) => getImpl(logger)(input, tableName, config),
      listByGroup: (input) => listByGroupImpl(logger)(input, tableName, config),
      listByUser: (input) => listByUserImpl(logger)(input, tableName, config),
      create: (input) => createImpl(logger)(input, tableName, config),
      delete: (input) => deleteImpl(logger)(input, tableName, config),
      update: (input) => updateImpl(logger)(input, tableName, config),
      count: (input) => countImpl(logger)(input, tableName, config),
    };
  };
}
