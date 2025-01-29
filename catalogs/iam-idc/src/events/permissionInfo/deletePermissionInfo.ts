import { z } from "zod";
import { ResultAsync } from "neverthrow";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { Logger } from "@stamp-lib/stamp-logger";

export const DeletePermissionInfoInput = z.object({
  permissionId: z.string(),
});
export type DeletePermissionInfoInput = z.infer<typeof DeletePermissionInfoInput>;

export type DeletePermissionInfo = (input: DeletePermissionInfoInput) => ResultAsync<void, HandlerError>;

export const deletePermissionInfo =
  (logger: Logger, tableName: string, config: DynamoDBClientConfig = {}): DeletePermissionInfo =>
  (input: DeletePermissionInfoInput) => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const params = {
      TableName: tableName,
      Key: {
        permissionId: input.permissionId,
      },
    };

    return ResultAsync.fromPromise(ddbDocClient.send(new DeleteCommand(params)), (err) => {
      logger.error("Failed to delete permission info", err);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).map(() => {});
  };
