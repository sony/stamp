import { CreateRoleCommand, DeleteRoleCommand, GetPolicyCommand, GetPolicyVersionCommand, IAMClient } from "@aws-sdk/client-iam";
import { Logger } from "@stamp-lib/stamp-logger";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { Result, ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import { IamRoleCatalogConfig, findAllowedGitHubOrg } from "../../config";
import {
  CreateGitHubIamRoleCommand,
  CreateGitHubIamRoleNameCommand,
  CreatedGitHubIamRole,
  CreatedGitHubIamRoleName,
  GitHubIamRole,
  ListGitHubIamRoleAuditItem,
  ListGitHubIamRoleAuditItemCommand,
  SubjectType,
} from "../../types/gitHubIamRole";

/**
 * Assembles the OIDC subject claim condition using GitHub's immutable format
 * (`repo:ORG@ORG_ID/REPO@REPO_ID:...`). Since 2026-07-15 all newly created,
 * renamed, or transferred repositories on github.com emit this format, so the
 * trust policy must match on it. Tokens from repositories still on the legacy
 * name-only format will NOT match roles created with this condition — such
 * repositories must opt in to the immutable format first.
 *
 * `subjectValue` is required for branch / environment / tag and must be absent
 * otherwise — enforced by the CreateGitHubIamRoleNameCommand schema; this
 * function throws if called with an invalid pairing (programming error).
 */
export const buildGitHubSubjectClaim = (input: {
  gitHubOrgName: string;
  gitHubOrgId: string;
  repositoryName: string;
  repositoryId: string;
  subjectType: SubjectType;
  subjectValue?: string;
}): string => {
  const base = `repo:${input.gitHubOrgName}@${input.gitHubOrgId}/${input.repositoryName}@${input.repositoryId}`;
  const requireValue = (): string => {
    if (!input.subjectValue) {
      throw new Error(`subjectValue is required for subjectType "${input.subjectType}"`);
    }
    return input.subjectValue;
  };
  switch (input.subjectType) {
    case "repository":
      return `${base}:*`;
    case "branch":
      return `${base}:ref:refs/heads/${requireValue()}`;
    case "tag":
      return `${base}:ref:refs/tags/${requireValue()}`;
    case "environment":
      return `${base}:environment:${requireValue()}`;
    case "pull_request":
      return `${base}:pull_request`;
  }
};

export type CreateGitHubIamRoleName = (input: CreateGitHubIamRoleNameCommand) => Result<CreatedGitHubIamRoleName, HandlerError>;
export const createGitHubIamRoleName =
  (config: IamRoleCatalogConfig): CreateGitHubIamRoleName =>
  (input) => {
    const parsedResult = CreateGitHubIamRoleNameCommand.safeParse(input);
    if (!parsedResult.success) {
      return err(
        new HandlerError(
          `Failed to parse input.: ${parsedResult.error}`,
          "BAD_REQUEST",
          `Failed to parse input.: ${parsedResult.error}. Please check input value.`
        )
      );
    }
    const parsedInput = parsedResult.data;
    const allowedOrg = findAllowedGitHubOrg(config, parsedInput.gitHubOrgName);
    if (!allowedOrg) {
      const message = `GitHub organization "${parsedInput.gitHubOrgName}" is not allowed. Allowed organizations: ${config.gitHubOrgs
        .map((org) => org.name)
        .join(", ")}.`;
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }
    const baseRoleName = `${config.roleNamePrefix}-github-${parsedInput.gitHubOrgName}-${parsedInput.repositoryName}`;
    const iamRoleName = parsedInput.roleSuffix ? `${baseRoleName}-${parsedInput.roleSuffix}` : baseRoleName;
    if (iamRoleName.length > 64) {
      return err(
        new HandlerError(
          `Failed to create role name. ${iamRoleName} is over 64 character.`,
          "BAD_REQUEST",
          `Failed to create role name. ${iamRoleName} is over 64 character. Please use a shorter repository name, role suffix, or a GitHub organization with a shorter name.`
        )
      );
    }
    const subject = buildGitHubSubjectClaim({
      gitHubOrgName: parsedInput.gitHubOrgName,
      gitHubOrgId: allowedOrg.id,
      repositoryName: parsedInput.repositoryName,
      repositoryId: parsedInput.repositoryId,
      subjectType: parsedInput.subjectType,
      subjectValue: parsedInput.subjectValue,
    });
    return ok({
      ...parsedInput,
      gitHubOrgId: allowedOrg.id,
      subject,
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
              "token.actions.githubusercontent.com:sub": parsedInput.subject,
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

    return ResultAsync.fromPromise(
      iamClient.send(deleteRole).then(
        () => ({ ok: true as const }),
        (error: unknown) => {
          // Treat a missing IAM role as success: the desired post-condition
          // (role no longer exists) already holds. Without this branch an
          // orphaned DB record (where the IAM role was deleted out-of-band)
          // can never be cleaned up via the normal deleteResource path, which
          // then blocks subsequent createResource calls with the duplicate-PK
          // legacy guard.
          const name = (error as { name?: string } | undefined)?.name;
          if (name === "NoSuchEntity" || name === "NoSuchEntityException") {
            logger.info(`IAM role ${input.iamRoleName} already absent; treating delete as success`);
            return { ok: true as const };
          }
          throw error;
        }
      ),
      (error) => {
        const errorMessage = `Failed to delete role: ${error}`;
        logger.error(errorMessage);
        return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
      }
    ).map(() => input);
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
