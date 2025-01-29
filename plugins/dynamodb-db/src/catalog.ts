import {
  CatalogDBProvider,
  CatalogDBGetByIdResult,
  CatalogDBListAllResult,
  CatalogDBSetResult,
  CatalogDBDeleteResult,
} from "@stamp-lib/stamp-types/pluginInterface/database";
import { z } from "zod";
import { CatalogInfoOnDB } from "@stamp-lib/stamp-types/models";
import { okAsync, ResultAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { parseDBItemAsync } from "./utils/neverthrow";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { Logger } from "@stamp-lib/stamp-logger";

export function getByIdImpl(logger: Logger) {
  return (id: string, TableName: string, config: DynamoDBClientConfig = {}): CatalogDBGetByIdResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand({ TableName: TableName, Key: { id } })), (err) => {
      logger.error(err);
      return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return getResult.andThen((result) => {
      if (result.Item === undefined) {
        return okAsync(none);
      } else {
        const parsedItem = parseDBItemAsync(logger)(result.Item, CatalogInfoOnDB);
        return parsedItem.map((item) => some(item));
      }
    });
  };
}

export function listAllImpl(logger: Logger) {
  return (TableName: string, config: DynamoDBClientConfig = {}): CatalogDBListAllResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const scanResult = ResultAsync.fromPromise(ddbDocClient.send(new ScanCommand({ TableName: TableName })), (err) => {
      logger.error(err);
      return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return scanResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync([]);
      } else {
        const parsedItems = parseDBItemAsync(logger)(result.Items, z.array(CatalogInfoOnDB));
        return parsedItems;
      }
    });
  };
}

export function setImpl(logger: Logger) {
  return (catalog: CatalogInfoOnDB, TableName: string, config: DynamoDBClientConfig = {}): CatalogDBSetResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    const putResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new PutCommand({
          TableName: TableName,
          Item: catalog,
        })
      ),
      (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return putResult.andThen(() => okAsync(catalog));
  };
}

export function deleteImpl(logger: Logger) {
  return (id: string, TableName: string, config: DynamoDBClientConfig = {}): CatalogDBDeleteResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const deleteResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new DeleteCommand({
          TableName: TableName,
          Key: { id },
        })
      ),
      (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return deleteResult.andThen(() => okAsync(undefined));
  };
}

export function createCatalogDBProvider(logger: Logger) {
  return (TableName: string, config: DynamoDBClientConfig = {}): CatalogDBProvider => {
    return {
      getById: (id) => getByIdImpl(logger)(id, TableName, config),
      listAll: () => listAllImpl(logger)(TableName, config),
      set: (catalog) => setImpl(logger)(catalog, TableName, config),
      delete: (id) => deleteImpl(logger)(id, TableName, config),
    };
  };
}
