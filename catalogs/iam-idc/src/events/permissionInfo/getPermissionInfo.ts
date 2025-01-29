import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { PermissionInfo } from "../../types/permission";
import { Option, some, none } from "@stamp-lib/stamp-option";
import { Logger } from "@stamp-lib/stamp-logger";

type GetPermissionInfoInput = { permissionId: string };
export type GetPermissionInfo = <T extends GetPermissionInfoInput>(input: T) => ResultAsync<Option<PermissionInfo>, HandlerError>;

export const getPermissionInfo =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): GetPermissionInfo =>
  (input) => {
    const param = {
      TableName: tableName,
      Key: {
        permissionId: input.permissionId,
      },
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    const command = new GetCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      logger.error("Failed to get permission info", err);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      if (!result.Item) {
        return okAsync(none);
      }
      const perseResult = PermissionInfo.safeParse(result.Item);
      if (!perseResult.success) {
        logger.error("Failed to parse DB item.", perseResult.error);
        return errAsync(new HandlerError("Failed to parse DB item.", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync(some(perseResult.data));
    });
  };
