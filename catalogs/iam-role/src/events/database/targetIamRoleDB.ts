import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  ScanCommandInput,
  QueryCommand,
  QueryCommandInput,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { TargetIamRole } from "../../types/targetIamRole";
import { Option, some, none } from "@stamp-lib/stamp-option";
import { z } from "zod";
import { Logger } from "@stamp-lib/stamp-logger";

export type GetTargetIamRoleDBItemInput = { id: string };
export type GetTargetIamRoleDBItem = (input: GetTargetIamRoleDBItemInput) => ResultAsync<Option<TargetIamRole>, HandlerError>;

export const getTargetIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): GetTargetIamRoleDBItem =>
  (input: GetTargetIamRoleDBItemInput) => {
    // extract accountId and iamRoleName from id({accountId}#{iamRoleName})
    const [accountId, iamRoleName] = input.id.split("#");
    const param = {
      TableName: tableName,
      Key: {
        accountId,
        iamRoleName,
      },
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    const command = new GetCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to get item from DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      if (!result.Item) {
        return okAsync(none);
      }
      const perseResult = TargetIamRole.safeParse(result.Item);
      if (!perseResult.success) {
        return errAsync(new HandlerError("Failed to parse DB item.", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync(some(perseResult.data));
    });
  };

export type ListTargetIamRoleDBItemInput = { namePrefix?: string; limit?: number; nextToken?: string };
export type ListTargetIamRoleDBItemOutput = { items: TargetIamRole[]; nextToken?: string };

export type ListTargetIamRoleDBItem = (input: ListTargetIamRoleDBItemInput) => ResultAsync<ListTargetIamRoleDBItemOutput, HandlerError>;

export const listTargetIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): ListTargetIamRoleDBItem =>
  (input) => {
    const exclusiveStartKey = input.nextToken ? JSON.parse(atob(input.nextToken)) : undefined;
    const param: ScanCommandInput = {
      TableName: tableName,
      FilterExpression: "begins_with(iamRoleName, :iamRoleName)",
      ExpressionAttributeValues: {
        ":iamRoleName": input.namePrefix ?? "",
      },
      Limit: input.limit ?? undefined,
      ExclusiveStartKey: exclusiveStartKey,
    };

    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    const command = new ScanCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to list items from DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      const items = result.Items ?? [];
      const nextToken = result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined;
      const perseResult = z.array(TargetIamRole).safeParse(items);
      if (!perseResult.success) {
        return errAsync(new HandlerError("Failed to parse DB items.", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync({ items: perseResult.data, nextToken });
    });
  };

export type ListTargetIamRoleDBItemByAccountIdInput = { accountId: string; namePrefix?: string; limit?: number; nextToken?: string };
export type ListTargetIamRoleDBItemByAccountIdOutput = { items: TargetIamRole[]; nextToken?: string };

export type ListTargetIamRoleDBItemByAccountId = (
  input: ListTargetIamRoleDBItemByAccountIdInput
) => ResultAsync<ListTargetIamRoleDBItemByAccountIdOutput, HandlerError>;

export const listTargetIamRoleDBItemByAccountId =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): ListTargetIamRoleDBItemByAccountId =>
  (input) => {
    const exclusiveStartKey = input.nextToken ? JSON.parse(atob(input.nextToken)) : undefined;
    const param: QueryCommandInput = (() => {
      if (input.namePrefix) {
        return {
          TableName: tableName,
          KeyConditionExpression: "accountId = :accountId AND begins_with(iamRoleName, :name)",
          ExpressionAttributeValues: {
            ":accountId": input.accountId,
            ":name": input.namePrefix,
          },
          Limit: input.limit ?? undefined,
          ExclusiveStartKey: exclusiveStartKey,
        };
      } else {
        return {
          TableName: tableName,
          KeyConditionExpression: "accountId = :accountId",
          ExpressionAttributeValues: {
            ":accountId": input.accountId,
          },
          Limit: input.limit ?? undefined,
          ExclusiveStartKey: exclusiveStartKey,
        };
      }
    })();

    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    const command = new QueryCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to list items from DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      const items = result.Items ?? [];
      const nextToken = result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined;
      const perseResult = z.array(TargetIamRole).safeParse(items);
      if (!perseResult.success) {
        return errAsync(new HandlerError("Failed to parse DB items.", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync({ items: perseResult.data, nextToken });
    });
  };

export type CreateTargetIamRoleDBItem = (input: TargetIamRole) => ResultAsync<TargetIamRole, HandlerError>;
export const createTargetIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): CreateTargetIamRoleDBItem =>
  (input) => {
    const parseResult = TargetIamRole.safeParse(input);
    if (!parseResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parseResult.error}`, "INTERNAL_SERVER_ERROR"));
    }
    const inputItem = parseResult.data;
    const param = {
      TableName: tableName,
      Item: inputItem,
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new PutCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to put item to DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen(() => {
      return okAsync(inputItem);
    });
  };

export type DeleteTargetIamRoleDBItemInput = { id: string };
export type DeleteTargetIamRoleDBItem = (input: DeleteTargetIamRoleDBItemInput) => ResultAsync<void, HandlerError>;

export const deleteTargetIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): DeleteTargetIamRoleDBItem =>
  (input) => {
    // extract accountId and iamRoleName from id({accountId}#{iamRoleName})
    const [accountId, iamRoleName] = input.id.split("#");
    const param = {
      TableName: tableName,
      Key: {
        accountId,
        iamRoleName,
      },
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new DeleteCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to delete item from DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).map(() => {});
  };
