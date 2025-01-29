import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import { PermissionInfo, ListPermissionInfoResult } from "../../types/permission";
import { Logger } from "@stamp-lib/stamp-logger";
import z from "zod";
export type ListPermissionInfoByAccountIdInput = { awsAccountId: string; namePrefix?: string; limit?: number; nextToken?: string };
export type ListPermissionInfoByAccountId = (input: ListPermissionInfoByAccountIdInput) => ResultAsync<ListPermissionInfoResult, HandlerError>;

export const listPermissionInfoByAccountId =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): ListPermissionInfoByAccountId =>
  (input: ListPermissionInfoByAccountIdInput) => {
    const exclusiveStartKey = input.nextToken ? JSON.parse(atob(input.nextToken)) : undefined;
    const param: QueryCommandInput = (() => {
      if (input.namePrefix) {
        return {
          TableName: tableName,
          IndexName: "awsAccountId_name_index",
          KeyConditionExpression: "awsAccountId = :awsAccountId and begins_with(#nm, :name)",
          ExpressionAttributeValues: {
            ":awsAccountId": input.awsAccountId,
            ":name": input.namePrefix,
          },
          ExpressionAttributeNames: {
            "#nm": "name",
          },
          Limit: input.limit ?? undefined,
          ExclusiveStartKey: exclusiveStartKey,
        };
      } else {
        return {
          TableName: tableName,
          IndexName: "awsAccountId_name_index",
          KeyConditionExpression: "awsAccountId = :awsAccountId",
          ExpressionAttributeValues: {
            ":awsAccountId": input.awsAccountId,
          },
          Limit: input.limit ?? undefined,
          ExclusiveStartKey: exclusiveStartKey,
        };
      }
    })();

    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new QueryCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      logger.error(`failed to list permission info by account id: ${err}`);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      if (!result.Items) {
        return errAsync(new HandlerError("Permission not found", "NOT_FOUND"));
      }
      const parsedResult = z.array(PermissionInfo).safeParse(result.Items);
      if (!parsedResult.success) {
        return errAsync(new HandlerError(`Failed to parse DB item.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
      }
      const nextToken = result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined;

      return okAsync({
        items: parsedResult.data,
        nextToken,
      });
    });
  };

export type ListPermissionInfoInput = { name?: string; limit?: number; nexToken?: string };
export type ListPermissionInfo = (input: ListPermissionInfoInput) => ResultAsync<ListPermissionInfoResult, HandlerError>;

export const listPermissionInfo =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): ListPermissionInfo =>
  (input: ListPermissionInfoInput) => {
    const exclusiveStartKey = input.nexToken ? JSON.parse(atob(input.nexToken)) : undefined;
    const param: ScanCommandInput = {
      TableName: tableName,
      FilterExpression: "begins_with(#nm, :name)",
      ExpressionAttributeValues: {
        ":name": input.name ?? "",
      },
      ExpressionAttributeNames: {
        "#nm": "name",
      },
      Limit: input.limit ?? undefined,
      ExclusiveStartKey: exclusiveStartKey,
    };

    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new ScanCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      logger.error(`failed to list permission info: ${err}`);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      if (!result.Items) {
        return errAsync(new HandlerError("Permission not found", "NOT_FOUND"));
      }
      const parsedResult = z.array(PermissionInfo).safeParse(result.Items);
      if (!parsedResult.success) {
        return errAsync(new HandlerError(`Failed to parse DB item.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
      }
      const nextToken = result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined;

      return okAsync({
        items: parsedResult.data,
        nextToken,
      });
    });
  };
