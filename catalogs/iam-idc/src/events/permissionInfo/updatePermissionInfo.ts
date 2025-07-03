import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync } from "neverthrow";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PermissionInfo } from "../../types/permission";
import { Logger } from "@stamp-lib/stamp-logger";

export type UpdatePermissionInfo = (input: PermissionInfo) => ResultAsync<PermissionInfo, HandlerError>;

export const updatePermissionInfo =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): UpdatePermissionInfo =>
  (input: PermissionInfo) => {
    const now = new Date().toISOString();
    const updatedItem: PermissionInfo = {
      ...input,
      updatedAt: now,
    };

    const updateExpression =
      "SET #desc = :desc, #sessionDuration = :sessionDuration, #managedPolicies = :managedPolicies, #customPolicies = :customPolicies, #updatedAt = :updatedAt";
    const expressionAttributeNames = {
      "#desc": "description",
      "#sessionDuration": "sessionDuration",
      "#managedPolicies": "managedIamPolicyNames",
      "#customPolicies": "customIamPolicyNames",
      "#updatedAt": "updatedAt",
    };
    const expressionAttributeValues = {
      ":desc": updatedItem.description,
      ":sessionDuration": updatedItem.sessionDuration,
      ":managedPolicies": updatedItem.managedIamPolicyNames,
      ":customPolicies": updatedItem.customIamPolicyNames,
      ":updatedAt": updatedItem.updatedAt,
    };

    const param = {
      TableName: tableName,
      Key: {
        permissionId: updatedItem.permissionId,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: "attribute_exists(permissionId)",
      ReturnValues: "ALL_NEW" as const,
    };

    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    const command = new UpdateCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      logger.error("Failed to update permission info", err);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).map((result) => result.Attributes as PermissionInfo);
  };
