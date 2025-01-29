import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  ScanCommandInput,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { GitHubIamRole } from "../../types/gitHubIamRole";
import { Option, some, none } from "@stamp-lib/stamp-option";
import { z } from "zod";
import { Logger } from "@stamp-lib/stamp-logger";

export type GetGitHubIamRoleDBItemInput = { repositoryName: string };
export type GetGitHubIamRoleDBItem = (input: GetGitHubIamRoleDBItemInput) => ResultAsync<Option<GitHubIamRole>, HandlerError>;

export const getGitHubIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): GetGitHubIamRoleDBItem =>
  (input: GetGitHubIamRoleDBItemInput) => {
    const param = {
      TableName: tableName,
      Key: {
        repositoryName: input.repositoryName,
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
      const perseResult = GitHubIamRole.safeParse(result.Item);
      if (!perseResult.success) {
        return errAsync(new HandlerError("Failed to parse DB item.", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync(some(perseResult.data));
    });
  };

export type ListGitHubIamRoleDBItemInput = { namePrefix?: string; limit?: number; nextToken?: string };
export type ListGitHubIamRoleDBItemOutput = { items: GitHubIamRole[]; nextToken?: string };
export type ListGitHubIamRoleDBItem = (input: ListGitHubIamRoleDBItemInput) => ResultAsync<ListGitHubIamRoleDBItemOutput, HandlerError>;

export const listGitHubIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): ListGitHubIamRoleDBItem =>
  (input) => {
    const exclusiveStartKey = input.nextToken ? JSON.parse(atob(input.nextToken)) : undefined;
    const param: ScanCommandInput = {
      TableName: tableName,
      FilterExpression: "begins_with(#nm, :name)",
      ExpressionAttributeValues: {
        ":name": input.namePrefix ?? "",
      },
      ExpressionAttributeNames: {
        "#nm": "repositoryName",
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
      const parsedResult = z.array(GitHubIamRole).safeParse(result.Items);
      if (!parsedResult.success) {
        return errAsync(new HandlerError(`Failed to parse DB item.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
      }
      const nextToken = result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined;
      return okAsync({ items: parsedResult.data, nextToken });
    });
  };

export type CreateGitHubIamRoleDBItem = (input: GitHubIamRole) => ResultAsync<GitHubIamRole, HandlerError>;

export const createGitHubIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): CreateGitHubIamRoleDBItem =>
  (input) => {
    const perseResult = GitHubIamRole.safeParse(input);
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

export type DeleteGitHubIamRoleDBItemInput = { repositoryName: string };
export type DeleteGitHubIamRoleDBItem = (input: DeleteGitHubIamRoleDBItemInput) => ResultAsync<void, HandlerError>;

export const deleteGitHubIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): DeleteGitHubIamRoleDBItem =>
  (input) => {
    const param = {
      TableName: tableName,
      Key: {
        repositoryName: input.repositoryName,
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

export const GitHubRepositoryName = z.object({
  repositoryName: z.string(),
});
export type GitHubRepositoryName = z.infer<typeof GitHubRepositoryName>;

export type GetByIamRoleNameInput = { iamRoleName: string };
export type GetByIamRoleName = (input: GetByIamRoleNameInput) => ResultAsync<Option<GitHubRepositoryName>, HandlerError>;
export const getByIamRoleName =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): GetByIamRoleName =>
  (input: GetByIamRoleNameInput) => {
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
      const perseResult = GitHubRepositoryName.safeParse(result.Items[0]);
      if (!perseResult.success) {
        return errAsync(new HandlerError("Failed to parse DB item.", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync(some(perseResult.data));
    });
  };
