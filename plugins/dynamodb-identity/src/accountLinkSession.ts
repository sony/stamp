import {
  IdentityPluginError,
  AccountLinkSession,
  AccountLinkSessionProvider,
  StartAccountLinkSessionInput,
  StartAccountLinkSessionOutput,
  GetAccountLinkSessionInput,
  GetAccountLinkSessionOutput,
  DeleteAccountLinkSessionInput,
  DeleteAccountLinkSessionOutput,
} from "@stamp-lib/stamp-types/pluginInterface/identity";

import { okAsync, ResultAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@stamp-lib/stamp-logger";
import { parseDBItemAsync } from "./utils/neverthrow";

const SESSION_EXPIRED_TIME = 1000 * 60 * 5; // 5 minutes

export function startImpl(logger: Logger) {
  return (input: StartAccountLinkSessionInput, tableName: string, config: DynamoDBClientConfig = {}): StartAccountLinkSessionOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const sessionKey = globalThis.crypto.randomUUID();
    const expirationTime = new Date(new Date().getTime() + SESSION_EXPIRED_TIME).getTime() / 1000; // Use epoch time in seconds for DynamoDB TTL.
    const params = {
      TableName: tableName,
      Item: {
        sessionKey: sessionKey,
        userId: input.userId,
        accountProviderName: input.accountProviderName,
        createdAt: new Date().toISOString(),
        expirationTime: expirationTime,
      },
    };
    const putResult = ResultAsync.fromPromise(ddbDocClient.send(new PutCommand(params)), (err) => {
      logger.error(err);
      return new IdentityPluginError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return putResult.andThen(() => {
      return okAsync({
        sessionKey: sessionKey,
        userId: input.userId,
        accountProviderName: input.accountProviderName,
        createdAt: params.Item.createdAt,
      });
    });
  };
}

export function getImpl(logger: Logger) {
  return (input: GetAccountLinkSessionInput, tableName: string, config: DynamoDBClientConfig = {}): GetAccountLinkSessionOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
        sessionKey: input.sessionKey,
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
        const parsedItem = parseDBItemAsync(result.Item, AccountLinkSession);
        return parsedItem.map((item) => some(item));
      }
    });
  };
}

export function deleteImpl(logger: Logger) {
  return (input: DeleteAccountLinkSessionInput, tableName: string, config: DynamoDBClientConfig = {}): DeleteAccountLinkSessionOutput => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const params = {
      TableName: tableName,
      Key: {
        sessionKey: input.sessionKey,
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

export function createAccountLinkSessionProvider(logger: Logger) {
  return (tableName: string, config: DynamoDBClientConfig): AccountLinkSessionProvider => {
    return {
      start: (input) => startImpl(logger)(input, tableName, config),
      get: (input) => getImpl(logger)(input, tableName, config),
      delete: (input) => deleteImpl(logger)(input, tableName, config),
    };
  };
}
