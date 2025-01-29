import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync } from "neverthrow";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { RegisterPermissionInput, PermissionInfo } from "../../types/permission";
import { Logger } from "@stamp-lib/stamp-logger";

export type RegisterPermissionInfo = (input: RegisterPermissionInput) => ResultAsync<PermissionInfo, HandlerError>;

export const registerPermissionInfo =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): RegisterPermissionInfo =>
  (input: RegisterPermissionInput) => {
    const now = new Date().toISOString();
    const item: PermissionInfo = {
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    const param = {
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(permissionId)",
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    const command = new PutCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      logger.error("Failed to register permission info", err);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).map(() => item);
  };
