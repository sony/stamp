import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@stamp-lib/stamp-logger";
import { none, Option, some } from "@stamp-lib/stamp-option";
import { SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { okAsync, ResultAsync } from "neverthrow";
import { z } from "zod";
import { parseDBItemAsync } from "../utils";
import { deserializeObject, serializeObject } from "./pagination";
export type DynamoDBconfig = {
  logger: Logger;
  TableName: string;
  config: DynamoDBClientConfig;
};

export const getById =
  (dynamoDBconfig: DynamoDBconfig) =>
  (id: string): ResultAsync<Option<SchedulerEvent>, SchedulerError> => {
    const client = new DynamoDBClient(dynamoDBconfig.config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand({ TableName: dynamoDBconfig.TableName, Key: { id } })), (err) => {
      dynamoDBconfig.logger.error(err);
      return new SchedulerError((err as Error).message ?? "Internal Server Error");
    });

    return getResult.andThen((result) => {
      if (result.Item === undefined) {
        return okAsync(none);
      } else {
        const parsedItem = parseDBItemAsync(result.Item, SchedulerEvent);
        return parsedItem.map((item) => some(item));
      }
    });
  };

export const listAll =
  (dynamoDBconfig: DynamoDBconfig) =>
  ({
    limit,
    paginationToken,
  }: {
    limit?: number;
    paginationToken?: string;
  }): ResultAsync<{ items: Array<SchedulerEvent>; nextPaginationToken?: string }, SchedulerError> => {
    const client = new DynamoDBClient(dynamoDBconfig.config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let exclusiveStartKey: Record<string, any> | undefined = undefined;
    if (paginationToken) {
      exclusiveStartKey = deserializeObject(paginationToken);
    }

    const scanResult = ResultAsync.fromPromise(
      ddbDocClient.send(new ScanCommand({ TableName: dynamoDBconfig.TableName, Limit: limit, ExclusiveStartKey: exclusiveStartKey })),
      (err) => {
        dynamoDBconfig.logger.error(err);
        return new SchedulerError((err as Error).message ?? "Internal Server Error");
      }
    );

    return scanResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync({ items: [] });
      } else {
        let paginationToken: string | undefined = undefined;
        if (result.LastEvaluatedKey) {
          paginationToken = serializeObject(result.LastEvaluatedKey);
        }
        const parsedItems = parseDBItemAsync(result.Items, z.array(SchedulerEvent));
        return parsedItems.map((items) => ({ items, nextPaginationToken: paginationToken }));
      }
    });
  };

export const listByEventType =
  (dynamoDBconfig: DynamoDBconfig) =>
  ({
    eventType,
    limit,
    paginationToken,
  }: {
    eventType: string;
    limit?: number;
    paginationToken?: string;
  }): ResultAsync<{ items: Array<SchedulerEvent>; nextPaginationToken?: string }, SchedulerError> => {
    const client = new DynamoDBClient(dynamoDBconfig.config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let exclusiveStartKey: Record<string, any> | undefined = undefined;
    if (paginationToken) {
      exclusiveStartKey = deserializeObject(paginationToken);
    }

    const scanResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new QueryCommand({
          TableName: dynamoDBconfig.TableName,
          Limit: limit,
          IndexName: "eventType-index",
          KeyConditionExpression: "eventType = :eventType",
          ExpressionAttributeValues: { ":eventType": eventType },
          ExclusiveStartKey: exclusiveStartKey,
        })
      ),
      (err) => {
        dynamoDBconfig.logger.error(err);
        return new SchedulerError((err as Error).message ?? "Internal Server Error");
      }
    );

    return scanResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync({ items: [] });
      } else {
        let paginationToken: string | undefined = undefined;
        if (result.LastEvaluatedKey) {
          paginationToken = serializeObject(result.LastEvaluatedKey);
        }
        const parsedItems = parseDBItemAsync(result.Items, z.array(SchedulerEvent));
        return parsedItems.map((items) => ({ items, nextPaginationToken: paginationToken }));
      }
    });
  };

export const createItem =
  (dynamoDBconfig: DynamoDBconfig) =>
  (event: SchedulerEvent): ResultAsync<SchedulerEvent, SchedulerError> => {
    const client = new DynamoDBClient(dynamoDBconfig.config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    const putResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new PutCommand({
          TableName: dynamoDBconfig.TableName,
          Item: event,
          ConditionExpression: "attribute_not_exists(id)",
        })
      ),
      (err) => {
        dynamoDBconfig.logger.error(err);
        return new SchedulerError((err as Error).message ?? "Internal Server Error");
      }
    );

    return putResult.andThen(() => okAsync(event));
  };

export const updateItem =
  (dynamoDBconfig: DynamoDBconfig) =>
  (event: SchedulerEvent): ResultAsync<SchedulerEvent, SchedulerError> => {
    const client = new DynamoDBClient(dynamoDBconfig.config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    const putResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new UpdateCommand({
          TableName: dynamoDBconfig.TableName,
          Key: {
            id: event.id,
          },
          ExpressionAttributeNames: {
            "#eventType": "eventType",
            "#property": "property",
            "#schedulePattern": "schedulePattern",
          },
          ExpressionAttributeValues: {
            ":eventType": event.eventType,
            ":property": event.property,
            ":schedulePattern": event.schedulePattern,
          },
          UpdateExpression: "set #eventType=:eventType, #property=:property, #schedulePattern=:schedulePattern",
          ReturnValues: "ALL_NEW",
          ConditionExpression: "attribute_exists(id)",
        })
      ),
      (err) => {
        dynamoDBconfig.logger.error(err);
        return new SchedulerError((err as Error).message ?? "Internal Server Error");
      }
    );

    return putResult.andThen(() => okAsync(event));
  };

export const deleteItem =
  (dynamoDBconfig: DynamoDBconfig) =>
  (id: string): ResultAsync<void, SchedulerError> => {
    const client = new DynamoDBClient(dynamoDBconfig.config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const deleteResult = ResultAsync.fromPromise(ddbDocClient.send(new DeleteCommand({ TableName: dynamoDBconfig.TableName, Key: { id } })), (err) => {
      dynamoDBconfig.logger.error(err);
      return new SchedulerError((err as Error).message ?? "Internal Server Error");
    });

    return deleteResult.andThen(() => okAsync(undefined));
  };
