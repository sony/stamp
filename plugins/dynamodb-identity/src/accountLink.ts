import {
  AccountLink,
  AccountLinkProvider,
  GetAccountLinkInput,
  GetAccountLinkOutput,
  ListAccountLinkByUserIdInput,
  ListAccountLinkByUserIdOutput,
  SetAccountLinkInput,
  SetAccountLinkOutput,
  DeleteAccountLinkInput,
  DeleteAccountLinkOutput,
  DeleteAllAccountLinkByUserIdInput,
  DeleteAllAccountLinkByUserIdOutput,
  IdentityPluginError,
} from "@stamp-lib/stamp-types/pluginInterface/identity";
import { z } from "zod";
import { okAsync, ResultAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@stamp-lib/stamp-logger";
import { parseDBItemAsync } from "./utils/neverthrow";

export function getImpl(logger: Logger) {
  return (input: GetAccountLinkInput, tableName: string, config: DynamoDBClientConfig = {}): GetAccountLinkOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
        accountProviderName: input.accountProviderName,
        accountId: input.accountId,
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
        const parsedItem = parseDBItemAsync(result.Item, AccountLink);
        return parsedItem.map((item) => some(item));
      }
    });
  };
}

export function listByUserIdImpl(logger: Logger) {
  return (input: ListAccountLinkByUserIdInput, tableName: string, config: DynamoDBClientConfig = {}): ListAccountLinkByUserIdOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      IndexName: "userId_index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": input.userId,
      },
    };
    const queryResult = ResultAsync.fromPromise(ddbDocClient.send(new QueryCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return queryResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync([]);
      } else {
        const parsedItems = parseDBItemAsync(result.Items, z.array(AccountLink));
        return parsedItems.map((items) => items);
      }
    });
  };
}

export function setImpl(logger: Logger) {
  return (input: SetAccountLinkInput, tableName: string, config: DynamoDBClientConfig = {}): SetAccountLinkOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Item: {
        accountProviderName: input.accountProviderName,
        accountId: input.accountId,
        userId: input.userId,
        createdAt: new Date().toISOString(),
      },
    };
    const putResult = ResultAsync.fromPromise(ddbDocClient.send(new PutCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return putResult.andThen(() => {
      return okAsync({
        accountProviderName: input.accountProviderName,
        accountId: input.accountId,
        userId: input.userId,
        createdAt: params.Item.createdAt,
      });
    });
  };
}

export function deleteImpl(logger: Logger) {
  return (input: DeleteAccountLinkInput, tableName: string, config: DynamoDBClientConfig = {}): DeleteAccountLinkOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
        accountProviderName: input.accountProviderName,
        accountId: input.accountId,
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

export function deleteAllByUserIdImpl(logger: Logger) {
  return (input: DeleteAllAccountLinkByUserIdInput, tableName: string, config: DynamoDBClientConfig = {}): DeleteAllAccountLinkByUserIdOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      IndexName: "userId_index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": input.userId,
      },
    };
    const queryResult = ResultAsync.fromPromise(ddbDocClient.send(new QueryCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return queryResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync(undefined);
      } else {
        const deleteResult = Promise.all(
          result.Items.map((item) => {
            const deleteParams = {
              TableName: tableName,
              Key: {
                accountProviderName: item.accountProviderName,
                accountId: item.accountId,
              },
            };
            return ddbDocClient.send(new DeleteCommand(deleteParams));
          })
        );
        return ResultAsync.fromPromise(deleteResult, (err) => {
          logger.error(err);
          return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        }).andThen(() => okAsync(undefined));
      }
    });
  };
}

export function createAccountLinkProvider(logger: Logger) {
  return (tableName: string, config: DynamoDBClientConfig): AccountLinkProvider => {
    return {
      get: (input) => getImpl(logger)(input, tableName, config),
      listByUserId: (input) => listByUserIdImpl(logger)(input, tableName, config),
      set: (input) => setImpl(logger)(input, tableName, config),
      delete: (input) => deleteImpl(logger)(input, tableName, config),
      deleteAllByUserId: (input) => deleteAllByUserIdImpl(logger)(input, tableName, config),
    };
  };
}
