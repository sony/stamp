import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import {
  CreateUserInput,
  CreateUserOutput,
  DeleteUserInput,
  DeleteUserOutput,
  GetUserInput,
  GetUserOutput,
  IdentityPluginError,
  ListUserInput,
  ListUserOutput,
  UpdateUserInput,
  UpdateUserOutput,
  User,
  UserProvider,
} from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { parseDBItemAsync } from "./utils/neverthrow";
import { deserializeObject, serializeObject } from "./utils/pagination";

export function getImpl(logger: Logger) {
  return (input: GetUserInput, tableName: string, config: DynamoDBClientConfig = {}): GetUserOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
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
        const parsedItem = parseDBItemAsync(result.Item, User);
        return parsedItem.map((item) => some(item));
      }
    });
  };
}

export function listImpl(logger: Logger) {
  return (input: ListUserInput, tableName: string, config: DynamoDBClientConfig = {}): ListUserOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Limit: input.limit,
      ExclusiveStartKey: input.paginationToken ? deserializeObject(input.paginationToken) : undefined,
    };
    const scanResult = ResultAsync.fromPromise(ddbDocClient.send(new ScanCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return scanResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync({ users: [], nextPaginationToken: undefined });
      } else {
        return parseDBItemAsync(result.Items, z.array(User)).andThen((items) => {
          let paginationToken: string | undefined = undefined;
          if (result.LastEvaluatedKey) {
            paginationToken = serializeObject(result.LastEvaluatedKey);
          }
          return okAsync({ users: items, nextPaginationToken: paginationToken });
        });
      }
    });
  };
}

export function createImpl(logger: Logger) {
  return (input: CreateUserInput, tableName: string, config: DynamoDBClientConfig = {}): CreateUserOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const userId = globalThis.crypto.randomUUID();
    const params = {
      TableName: tableName,
      Item: {
        userId: userId,
        userName: input.userName,
        email: input.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ConditionExpression: "attribute_not_exists(userId)",
    };
    const putResult = ResultAsync.fromPromise(ddbDocClient.send(new PutCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return putResult.andThen(() => {
      return okAsync({
        userId: userId,
        userName: input.userName,
        email: input.email,
        createdAt: params.Item.createdAt,
        updatedAt: params.Item.updatedAt,
      });
    });
  };
}

export function deleteImpl(logger: Logger) {
  return (input: DeleteUserInput, tableName: string, config: DynamoDBClientConfig = {}): DeleteUserOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
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
  return (input: UpdateUserInput, tableName: string, config: DynamoDBClientConfig = {}): UpdateUserOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const updateResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            userId: input.userId,
          },
          UpdateExpression: "SET userName = :userName, email = :email, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":userName": input.userName,
            ":email": input.email,
            ":updatedAt": new Date().toISOString(),
          },
          ReturnValues: "ALL_NEW",
        })
      ),
      (err) => {
        logger.error(err);
        return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return updateResult.andThen((result) => {
      const parsedItem = parseDBItemAsync(result.Attributes, User);
      return parsedItem.map((item) => item);
    });
  };
}

export function createUserProvider(logger: Logger) {
  return (tableName: string, config: DynamoDBClientConfig = {}): UserProvider => {
    return {
      get: (input) => getImpl(logger)(input, tableName, config),
      list: (input) => listImpl(logger)(input, tableName, config),
      create: (input) => createImpl(logger)(input, tableName, config),
      delete: (input) => deleteImpl(logger)(input, tableName, config),
      update: (input) => updateImpl(logger)(input, tableName, config),
    };
  };
}
