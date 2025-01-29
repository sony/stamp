import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  ScanCommand,
  ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { Option, none, some } from "@stamp-lib/stamp-option";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { JumpIamRole } from "../../types/jumpIamRole";
import { Logger } from "@stamp-lib/stamp-logger";

export type GetJumpIamRoleDBItemInput = { jumpIamRoleName: string };
export type GetJumpIamRoleDBItem = (input: GetJumpIamRoleDBItemInput) => ResultAsync<Option<JumpIamRole>, HandlerError>;

export const getJumpIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): GetJumpIamRoleDBItem =>
  (input: GetJumpIamRoleDBItemInput) => {
    const param = {
      TableName: tableName,
      Key: {
        jumpIamRoleName: input.jumpIamRoleName,
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
      const perseResult = JumpIamRole.safeParse(result.Item);
      if (!perseResult.success) {
        return errAsync(new HandlerError("Failed to parse DB item.", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync(some(perseResult.data));
    });
  };

export type ListJumpIamRoleDBItemInput = { namePrefix?: string; limit?: number; nextToken?: string };
export type ListJumpIamRoleDBItemOutput = { items: JumpIamRole[]; nextToken?: string };
export type ListJumpIamRoleDBItem = (input: ListJumpIamRoleDBItemInput) => ResultAsync<ListJumpIamRoleDBItemOutput, HandlerError>;

export const listJumpIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): ListJumpIamRoleDBItem =>
  (input) => {
    const exclusiveStartKey = input.nextToken ? JSON.parse(atob(input.nextToken)) : undefined;
    const param: ScanCommandInput = {
      TableName: tableName,
      FilterExpression: "begins_with(#nm, :name)",
      ExpressionAttributeValues: {
        ":name": input.namePrefix ?? "",
      },
      ExpressionAttributeNames: {
        "#nm": "jumpIamRoleName",
      },
      Limit: input.limit ?? undefined,
      ExclusiveStartKey: exclusiveStartKey,
    };

    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new ScanCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to list items from DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      if (!result.Items) {
        return okAsync({ items: [] });
      }
      const parsedResult = z.array(JumpIamRole).safeParse(result.Items);
      if (!parsedResult.success) {
        return errAsync(new HandlerError(`Failed to parse DB item.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
      }
      const nextToken = result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined;
      return okAsync({ items: parsedResult.data, nextToken });
    });
  };

export type CreateJumpIamRoleDBItem = (input: JumpIamRole) => ResultAsync<JumpIamRole, HandlerError>;

export const createJumpIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): CreateJumpIamRoleDBItem =>
  (input) => {
    const perseResult = JumpIamRole.safeParse(input);
    if (!perseResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${perseResult.error.toString()}`, "INTERNAL_SERVER_ERROR"));
    }
    const itemInput = perseResult.data;
    const param = {
      TableName: tableName,
      Item: itemInput,
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new PutCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to put item to DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen(() => {
      return okAsync(itemInput);
    });
  };

export type DeleteJumpIamRoleDBItemInput = { jumpIamRoleName: string };
export type DeleteJumpIamRoleDBItem = (input: DeleteJumpIamRoleDBItemInput) => ResultAsync<void, HandlerError>;

export const deleteJumpIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): DeleteJumpIamRoleDBItem =>
  (input) => {
    const param = {
      TableName: tableName,
      Key: {
        jumpIamRoleName: input.jumpIamRoleName,
      },
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new DeleteCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to delete item from DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen(() => {
      return okAsync(void 0);
    });
  };

export const JumpIamRoleName = z.object({
  jumpIamRoleName: z.string(),
});
export type JumpIamRoleName = z.infer<typeof JumpIamRoleName>;

export type GetByJumpIamRoleNameInput = { iamRoleName: string };
export type GetByJumpIamRoleName = (input: GetByJumpIamRoleNameInput) => ResultAsync<Option<JumpIamRoleName>, HandlerError>;
export const getByJumpIamRoleName =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): GetByJumpIamRoleName =>
  (input: GetByJumpIamRoleNameInput) => {
    const params: QueryCommandInput = {
      TableName: tableName,
      IndexName: "IamRoleNameIndex",
      KeyConditionExpression: "iamRoleName = :iamRoleName",
      ExpressionAttributeValues: {
        ":iamRoleName": input.iamRoleName,
      },
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new QueryCommand(params);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to get item from DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      if (!result.Items || result.Items.length === 0) {
        return okAsync(none);
      }
      const perseResult = JumpIamRoleName.safeParse(result.Items[0]);
      if (!perseResult.success) {
        return errAsync(new HandlerError("Failed to parse DB item.", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync(some(perseResult.data));
    });
  };
