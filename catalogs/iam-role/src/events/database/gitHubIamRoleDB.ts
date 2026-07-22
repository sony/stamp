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
import { CreatedGitHubIamRole, GitHubIamRole } from "../../types/gitHubIamRole";
import { Option, some, none } from "@stamp-lib/stamp-option";
import { z } from "zod";
import { Logger } from "@stamp-lib/stamp-logger";

/**
 * Builds the DynamoDB primary-key value (also the Stamp `resourceId`) for a
 * GitHub IAM Role resource. With multi-org support the PK is the compound
 * `${gitHubOrgName}/${repositoryName}` so that the same repo name can exist
 * under different orgs without collision. An optional role suffix extends it
 * to `${gitHubOrgName}/${repositoryName}/${roleSuffix}` so that multiple IAM
 * roles can exist for the same repository.
 */
export const buildGitHubIamRolePkValue = (gitHubOrgName: string, repositoryName: string, roleSuffix?: string): string =>
  roleSuffix ? `${gitHubOrgName}/${repositoryName}/${roleSuffix}` : `${gitHubOrgName}/${repositoryName}`;

/**
 * Extracts the bare repository name from the persisted primary-key value.
 * Multi-org records use the compound form `${org}/${repo}` (optionally
 * `${org}/${repo}/${suffix}`); legacy single-org records store the bare repo
 * name as PK directly. Neither GitHub org names nor repository names may
 * contain `/`, so the repo name is always the second segment when a `/` is
 * present. Useful when only the PK is available (e.g. when reading via the
 * `IamRoleNameIndex` GSI which has `KEYS_ONLY` projection).
 */
export const extractBareRepositoryName = (pkValue: string): string => {
  const segments = pkValue.split("/");
  return segments.length === 1 ? segments[0] : segments[1];
};

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
    const namePrefix = input.namePrefix ?? "";
    // Match either the PK (`repositoryName`) — which covers legacy bare-name
    // records — or the explicit `gitHubRepositoryName` attribute introduced
    // for multi-org records. This lets users search by bare repository name
    // regardless of whether the resource was created before or after the
    // multi-org migration.
    const param: ScanCommandInput = {
      TableName: tableName,
      FilterExpression: "begins_with(#pk, :name) OR begins_with(#bare, :name)",
      ExpressionAttributeValues: {
        ":name": namePrefix,
      },
      ExpressionAttributeNames: {
        "#pk": "repositoryName",
        "#bare": "gitHubRepositoryName",
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

export type CreateGitHubIamRoleDBItem = (input: CreatedGitHubIamRole) => ResultAsync<GitHubIamRole, HandlerError>;

export const createGitHubIamRoleDBItem =
  (logger: Logger, tableName: string, DynamoDBClientConfig = {}): CreateGitHubIamRoleDBItem =>
  (input) => {
    // Validate input first to surface bare-repo / org-level mistakes (e.g.
    // empty strings) before we synthesize the compound PK. The persisted
    // schema is intentionally lenient (it must accept legacy items missing
    // these fields), so it would otherwise silently coerce an empty repo
    // name into a `${org}/` PK.
    const inputValidation = CreatedGitHubIamRole.safeParse(input);
    if (!inputValidation.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${inputValidation.error.toString()}`, "INTERNAL_SERVER_ERROR"));
    }
    // Persist with the compound primary key (`${org}/${bareRepo}` or
    // `${org}/${bareRepo}/${roleSuffix}`) so that resources with identical
    // bare repo names across different orgs — and multiple roles for the same
    // repo — do not collide.
    const itemInput: GitHubIamRole = {
      repositoryName: buildGitHubIamRolePkValue(input.gitHubOrgName, input.repositoryName, input.roleSuffix),
      gitHubRepositoryName: input.repositoryName,
      gitHubOrgName: input.gitHubOrgName,
      gitHubRepositoryId: input.repositoryId,
      gitHubOrgId: input.gitHubOrgId,
      roleSuffix: input.roleSuffix,
      subjectType: input.subjectType,
      subjectValue: input.subjectValue,
      subject: input.subject,
      iamRoleName: input.iamRoleName,
      iamRoleArn: input.iamRoleArn,
      createdAt: input.createdAt,
    };
    const perseResult = GitHubIamRole.safeParse(itemInput);
    if (!perseResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${perseResult.error.toString()}`, "INTERNAL_SERVER_ERROR"));
    }
    const param = {
      TableName: tableName,
      Item: perseResult.data,
      // The handler pre-checks for an existing PK, but that check is not
      // atomic with this write. Fail loudly instead of silently overwriting a
      // concurrent create's record (which would orphan its IAM role).
      ConditionExpression: "attribute_not_exists(repositoryName)",
    };
    const client = new DynamoDBClient(DynamoDBClientConfig);
    // removeUndefinedValues: optional attributes (roleSuffix etc.) may be
    // undefined and must be dropped rather than fail marshalling.
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    const command = new PutCommand(param);

    return ResultAsync.fromPromise(ddbDocClient.send(command), (err) => {
      const errorMessage = `Failed to put item to DB: ${err}`;
      logger.error(errorMessage);
      return new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    }).andThen(() => {
      return okAsync(perseResult.data);
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
  gitHubRepositoryName: z.string().optional(),
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
