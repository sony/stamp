import {
  ApprovalFlowDBProvider,
  ApprovalFlowDBGetByIdResult,
  ApprovalFlowDBListResult,
  ApprovalFlowDBSetResult,
  ApprovalFlowDBDeleteResult,
} from "@stamp-lib/stamp-types/pluginInterface/database";
import { z } from "zod";
import { ApprovalFlowInfoOnDB } from "@stamp-lib/stamp-types/models";
import { okAsync, ResultAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { parseDBItemAsync } from "./utils/neverthrow";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { Logger } from "@stamp-lib/stamp-logger";

export function getByIdImpl(logger: Logger) {
  return (catalogId: string, approvalFlowId: string, TableName: string, config: DynamoDBClientConfig = {}): ApprovalFlowDBGetByIdResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand({ TableName: TableName, Key: { catalogId, approvalFlowId } })), (err) => {
      logger.error(err);
      return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return getResult.andThen((result) => {
      if (result.Item === undefined) {
        return okAsync(none);
      } else {
        const parsedItem = parseDBItemAsync(logger)({ ...result.Item, id: approvalFlowId }, ApprovalFlowInfoOnDB);
        return parsedItem.map((item) => some(item));
      }
    });
  };
}

export function listByCatalogIdImpl(logger: Logger) {
  return (catalogId: string, TableName: string, config: DynamoDBClientConfig = {}): ApprovalFlowDBListResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const queryResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new QueryCommand({
          TableName: TableName,
          KeyConditionExpression: "catalogId = :catalogId",
          ExpressionAttributeValues: {
            ":catalogId": catalogId,
          },
        })
      ),
      (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return queryResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync([]);
      } else {
        const mappingItems = result.Items.map((item) => ({ ...item, id: item.approvalFlowId }));
        const parsedItems = parseDBItemAsync(logger)(mappingItems, z.array(ApprovalFlowInfoOnDB));
        return parsedItems;
      }
    });
  };
}

export function setImpl(logger: Logger) {
  return (approvalFlow: ApprovalFlowInfoOnDB, TableName: string, config: DynamoDBClientConfig = {}): ApprovalFlowDBSetResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    return ResultAsync.fromPromise(
      ddbDocClient.send(
        new PutCommand({
          TableName: TableName,
          Item: { ...approvalFlow, approvalFlowId: approvalFlow.id, id: undefined },
        })
      ),
      (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    ).andThen(() => okAsync(approvalFlow));
  };
}

export function deleteImpl(logger: Logger) {
  return (catalogId: string, approvalFlowId: string, TableName: string, config: DynamoDBClientConfig = {}): ApprovalFlowDBDeleteResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    return ResultAsync.fromPromise(
      ddbDocClient.send(
        new DeleteCommand({
          TableName: TableName,
          Key: { catalogId, approvalFlowId },
        })
      ),
      (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    ).andThen(() => okAsync(undefined));
  };
}

export function createApprovalFlowDBProvider(logger: Logger) {
  return (TableName: string, config: DynamoDBClientConfig = {}): ApprovalFlowDBProvider => {
    return {
      getById: (catalogId: string, approvalFlowId: string) => getByIdImpl(logger)(catalogId, approvalFlowId, TableName, config),
      listByCatalogId: (catalogId: string) => listByCatalogIdImpl(logger)(catalogId, TableName, config),
      set: (approvalFlow: ApprovalFlowInfoOnDB) => setImpl(logger)(approvalFlow, TableName, config),
      delete: (catalogId: string, approvalFlowId: string) => deleteImpl(logger)(catalogId, approvalFlowId, TableName, config),
    };
  };
}
