import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand, ScanCommandInput, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { AwsAccount } from "../../types/awsAccount";
import { Option, some, none } from "@stamp-lib/stamp-option";
import { z } from "zod";
import { Logger } from "@stamp-lib/stamp-logger";

export type GetAwsAccountDBItemInput = { accountId: string };
export type GetAwsAccountDBItem = (input: GetAwsAccountDBItemInput) => ResultAsync<Option<AwsAccount>, HandlerError>;

export const getAwsAccountDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): GetAwsAccountDBItem =>
  (input: GetAwsAccountDBItemInput) => {
    const param = {
      TableName: tableName,
      Key: {
        accountId: input.accountId,
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
      const perseResult = AwsAccount.safeParse(result.Item);
      if (!perseResult.success) {
        return errAsync(new HandlerError("Failed to parse DB item.", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync(some(perseResult.data));
    });
  };

export type ListAwsAccountDBItemInput = { namePrefix?: string; limit?: number; nextToken?: string };
export type ListAwsAccountDBItemOutput = { items: AwsAccount[]; nextToken?: string };
export type ListAwsAccountDBItem = (input: ListAwsAccountDBItemInput) => ResultAsync<ListAwsAccountDBItemOutput, HandlerError>;

export const listAwsAccountDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): ListAwsAccountDBItem =>
  (input) => {
    const exclusiveStartKey = input.nextToken ? JSON.parse(atob(input.nextToken)) : undefined;
    const param: ScanCommandInput = {
      TableName: tableName,
      FilterExpression: "begins_with(#nm, :name)",
      ExpressionAttributeValues: {
        ":name": input.namePrefix ?? "",
      },
      ExpressionAttributeNames: {
        "#nm": "name",
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
      if (!result.Items) {
        return okAsync({ items: [] });
      }
      const perseResult = z.array(AwsAccount).safeParse(result.Items);
      if (!perseResult.success) {
        return errAsync(new HandlerError("Failed to parse DB item.", "INTERNAL_SERVER_ERROR"));
      }
      const nextToken = result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined;
      return okAsync({ items: perseResult.data, nextToken });
    });
  };

export type CreateAwsAccountDBItem = (input: AwsAccount) => ResultAsync<AwsAccount, HandlerError>;
export const createAwsAccountDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): CreateAwsAccountDBItem =>
  (input) => {
    const perseResult = AwsAccount.safeParse(input);
    if (!perseResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.:${perseResult.error.toString()}`, "INTERNAL_SERVER_ERROR"));
    }
    const parsedInput = perseResult.data;
    const param = {
      TableName: tableName,
      Item: parsedInput,
      ConditionExpression: "attribute_not_exists(accountId)",
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    const command = new PutCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to put item to DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).map(() => parsedInput);
  };

export type DeleteAwsAccountDBItemInput = { accountId: string };
export type DeleteAwsAccountDBItem = (input: DeleteAwsAccountDBItemInput) => ResultAsync<void, HandlerError>;

export const deleteAwsAccountDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): DeleteAwsAccountDBItem =>
  (input) => {
    const param = {
      TableName: tableName,
      Key: {
        accountId: input.accountId,
      },
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new DeleteCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to delete item from DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).map(() => void 0);
  };
