import { CreateRoleCommand, DeleteRoleCommand, GetPolicyCommand, GetPolicyVersionCommand, IAMClient } from "@aws-sdk/client-iam";
import { Logger } from "@stamp-lib/stamp-logger";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { Result, ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import { IamRoleCatalogConfig } from "../../config";
import {
  CreateGitHubIamRoleCommand,
  CreateGitHubIamRoleNameCommand,
  CreatedGitHubIamRole,
  CreatedGitHubIamRoleName,
  GitHubIamRole,
  ListGitHubIamRoleAuditItem,
  ListGitHubIamRoleAuditItemCommand,
} from "../../types/gitHubIamRole";

export type CreateGitHubIamRoleName = (input: CreateGitHubIamRoleNameCommand) => Result<CreatedGitHubIamRoleName, HandlerError>;
export const createGitHubIamRoleName =
  (config: IamRoleCatalogConfig): CreateGitHubIamRoleName =>
  (input) => {
    const iamRoleName = `${config.roleNamePrefix}-github-${config.gitHubOrgName}-${input.repositoryName}`;
    if (iamRoleName.length > 64) {
      return err(
        new HandlerError(
          `Failed to create role name. ${iamRoleName} is over 64 character.`,
          "BAD_REQUEST",
          `Failed to create role name. ${iamRoleName} is over 64 character. Please change repository name to short one.`
        )
      );
    }
    return ok({
      repositoryName: input.repositoryName,
      iamRoleName,
    });
  };

export type CreateGitHubIamRoleInAws = (input: CreateGitHubIamRoleCommand) => ResultAsync<CreatedGitHubIamRole, HandlerError>;
export const createGitHubIamRoleInAws =
  (logger: Logger, config: IamRoleCatalogConfig, iamClient: IAMClient): CreateGitHubIamRoleInAws =>
  (input) => {
    const parsedResult = CreateGitHubIamRoleCommand.safeParse(input);
    if (!parsedResult.success) {
      return errAsync(
        new HandlerError(
          `Failed to parse input.: ${parsedResult.error}`,
          "BAD_REQUEST",
          `Failed to parse input.: ${parsedResult.error}. Please check input value.`
        )
      );
    }
    const parsedInput = parsedResult.data;

    const assumeRolePolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "",
          Effect: "Allow",
          Principal: {
            Federated: `arn:aws:iam::${config.iamRoleFactoryAccountId}:oidc-provider/token.actions.githubusercontent.com`,
          },
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringLike: {
              "token.actions.githubusercontent.com:sub": `repo:${config.gitHubOrgName}/${parsedInput.repositoryName}:*`,
            },
          },
        },
      ],
    };
    const createRoleCommand = new CreateRoleCommand({
      RoleName: input.iamRoleName,
      AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
    });

    return ResultAsync.fromPromise(iamClient.send(createRoleCommand), (error) => {
      const errorMessage = `Failed to create role: ${error}`;
      logger.error(errorMessage);
      return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      const createdRoleArn = result.Role?.Arn;
      if (!createdRoleArn) {
        return errAsync(new HandlerError(`Failed to create role. result.Role.Arn is undefined`, "INTERNAL_SERVER_ERROR"));
      }
      return okAsync({ ...parsedInput, iamRoleArn: createdRoleArn, createdAt: new Date().toISOString() });
    });
  };

export type DeleteGitHubIamRoleInAws = (input: GitHubIamRole) => ResultAsync<GitHubIamRole, HandlerError>;
export const deleteGitHubIamRoleInAws =
  (logger: Logger, iamClient: IAMClient): DeleteGitHubIamRoleInAws =>
  (input) => {
    const deleteRole = new DeleteRoleCommand({
      RoleName: input.iamRoleName,
    });

    return ResultAsync.fromPromise(iamClient.send(deleteRole), (error) => {
      const errorMessage = `Failed to delete role: ${error}`;
      logger.error(errorMessage);
      return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
    }).map(() => input);
  };

export type ListGitHubIamRoleAuditItemInAws = (input: ListGitHubIamRoleAuditItemCommand) => ResultAsync<ListGitHubIamRoleAuditItem, HandlerError>;
export const listGitHubIamRoleAuditItemInAws =
  (logger: Logger, iamClient: IAMClient): ListGitHubIamRoleAuditItemInAws =>
  (input) => {
    const getResourcesResults = input.attachedPolicyArns.map((policyArn) => {
      return getPolicyStatementResources(logger, iamClient, policyArn);
    });

    return ResultAsync.combine(getResourcesResults)
      .map((policyStatementResources) => {
        let auditItem: string[] = [];

        for (const resource of policyStatementResources) {
          auditItem = auditItem.concat(resource);
        }

        return { items: auditItem };
      })
      .mapErr((error) => {
        const errorMessage = `Failed to get policy statement resources: ${error}`;
        logger.error(errorMessage);
        return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
      });
  };

const getPolicyStatementResources = (logger: Logger, iamClient: IAMClient, policyArn: string): ResultAsync<string[], HandlerError> => {
  const getPolicyCommand = new GetPolicyCommand({
    PolicyArn: policyArn,
  });

  return ResultAsync.fromPromise(iamClient.send(getPolicyCommand), (error) => {
    const errorMessage = `Failed to get policy: ${error}`;
    logger.error(errorMessage);
    return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
  }).andThen((getPolicyResult) => {
    if (!getPolicyResult.Policy) {
      return errAsync(new HandlerError(`Failed to get policy. Policy is undefined`, "INTERNAL_SERVER_ERROR"));
    }
    const getPolicyVersionCommand = new GetPolicyVersionCommand({
      PolicyArn: getPolicyResult.Policy.Arn,
      VersionId: getPolicyResult.Policy.DefaultVersionId,
    });

    return ResultAsync.fromPromise(iamClient.send(getPolicyVersionCommand), (error) => {
      const errorMessage = `Failed to get policy version: ${error}`;
      logger.error(errorMessage);
      return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
    }).andThen((getPolicyVersionResult) => {
      if (!getPolicyVersionResult.PolicyVersion?.Document) {
        return errAsync(new HandlerError(`Failed to get policy version. PolicyVersion.Document is undefined`, "INTERNAL_SERVER_ERROR"));
      }

      // The policy document is URL-encoded compliant
      const decodedPolicyDocument = decodeURIComponent(getPolicyVersionResult.PolicyVersion?.Document ?? "");
      const resources: string[] = [];
      let statements;

      try {
        statements = JSON.parse(decodedPolicyDocument).Statement;
      } catch (error) {
        logger.error(error);
        return errAsync(new HandlerError(`Failed to parse JSON. PolicyVersion.Document is empty`, "INTERNAL_SERVER_ERROR"));
      }

      for (const statement of statements) {
        if (statement.Action.includes("sts:AssumeRole")) {
          resources.push(statement.Resource);
        }
      }

      return okAsync(resources);
    });
  });
};
