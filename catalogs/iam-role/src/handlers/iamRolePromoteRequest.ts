import { ok, err, Result, ResultAsync } from "neverthrow";
import { ApprovalFlowHandler } from "@stamp-lib/stamp-types/catalogInterface/handler";
import {
  ApprovalRequestValidationInput,
  ApprovalRequestValidationOutput,
  ApprovedInput,
  ApprovedOutput,
  RevokedInput,
  RevokedOutput,
  HandlerError,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { createLogger } from "@stamp-lib/stamp-logger";
import { getAwsAccountDBItem } from "../events/database/awsAccountDB";
import { getGitHubIamRoleDBItem } from "../events/database/gitHubIamRoleDB";
import { getTargetIamRoleDBItem } from "../events/database/targetIamRoleDB";

import { promoteIamRole, demoteIamRole, listIamRoleAttachedPolicyArns, fetchAllAttachedRolePolicyArns } from "../events/iam-ops/iamRoleManagement";

import { IamRoleCatalogConfig } from "../config";

import { IAMClient } from "@aws-sdk/client-iam";
import { assumeRoleCredentialProvider } from "../utils/assumeRoleCredentialProvider";

export function createIamRolePromoteRequestHandler(iamRoleCatalogConfig: IamRoleCatalogConfig): ApprovalFlowHandler {
  const iamRolePromoteRequestHandler: ApprovalFlowHandler = {
    approvalRequestValidation: approvalRequestValidationHandler(iamRoleCatalogConfig),
    approved: approvedHandler(iamRoleCatalogConfig),
    revoked: revokedHandler(iamRoleCatalogConfig),
  };

  return iamRolePromoteRequestHandler;
}

const approvalRequestValidationHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ApprovalFlowHandler["approvalRequestValidation"] =>
  async (input: ApprovalRequestValidationInput): Promise<Result<ApprovalRequestValidationOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("approvalRequestValidation", input, IamRoleCatalogConfig);

    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    if (!input.inputResources["github-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources github-iam-role", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["aws-account"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["target-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }

    const gitHubIamRoleResult = getGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      repositoryName: input.inputResources["github-iam-role"].resourceId,
    });

    const awsAccountResult = getAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })({
      accountId: input.inputResources["aws-account"].resourceId,
    });

    const targetIamRoleResult = getTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      id: input.inputResources["target-iam-role"].resourceId,
    });

    const result = await ResultAsync.combine([gitHubIamRoleResult, awsAccountResult, targetIamRoleResult]).map(([gitHubIamRole, awsAccount, targetIamRole]) => {
      if (gitHubIamRole.isNone()) {
        const message = `GitHub IAM Role Resource not found: ${input.inputResources["github-iam-role"].resourceId}`;
        return { isSuccess: false, message };
      }
      if (awsAccount.isNone()) {
        const message = `AWS Account Resource not found: ${input.inputResources["aws-account"].resourceId}`;
        return { isSuccess: false, message };
      }
      if (targetIamRole.isNone()) {
        const message = `Target IAM Role Resource not found: ${input.inputResources["target-iam-role"].resourceId}`;
        return { isSuccess: false, message };
      }
      const message = `Promote GitHub Repository Role request.\n GitHub Repository: ${gitHubIamRole.value.repositoryName}\n AWS Account: ${awsAccount.value.name}(${awsAccount.value.accountId})\n Target IAM Role: ${targetIamRole.value.iamRoleName}`;
      return { isSuccess: true, message, targetIamRole: targetIamRole.value, gitHubIamRole: gitHubIamRole.value };
    });

    if (result.isErr()) {
      return result;
    }

    if (result.isOk() && result.value.isSuccess === false) {
      return ok({ isSuccess: false, message: result.value.message });
    }

    if (!result.value.gitHubIamRole) {
      return err(new HandlerError("Invalid input inputResources gitHubIamRole", "INTERNAL_SERVER_ERROR"));
    }

    const listAttachedRolePoliciesFunc = listIamRoleAttachedPolicyArns(logger, iamClient);
    const fetchAllAttachedRolePolicyArnsFunc = fetchAllAttachedRolePolicyArns(listAttachedRolePoliciesFunc);
    const allAttachedRolePolicyArnsResult = await fetchAllAttachedRolePolicyArnsFunc({
      iamRoleName: result.value.gitHubIamRole?.iamRoleName,
    });

    if (allAttachedRolePolicyArnsResult.isErr()) {
      const message = `Promote GitHub Repository Role request failed. ${allAttachedRolePolicyArnsResult.error.message}`;
      logger.error(message);
      return ok({ isSuccess: false, message });
    }

    const targetAssumeRolePolicyArn = result.value.targetIamRole?.assumeRolePolicyArn;
    const attachedPolicyArns = allAttachedRolePolicyArnsResult.value.attachedPolicyArns;
    const filteredPolicyArns = attachedPolicyArns.filter((arn) => arn !== targetAssumeRolePolicyArn); // Exclude IAM policies that you plan to attach from the attached list.
    if (filteredPolicyArns.length >= 10) {
      const message = `Promote GitHub Repository Role request failed. The target IAM role has reached the AssumeRole limit. Please demote the repository for which you have finished using the IAM role.`;
      logger.error(message);
      return ok({ isSuccess: false, message });
    }

    return ok({ isSuccess: true, message: result.value.message });
  };

const approvedHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ApprovalFlowHandler["approved"] =>
  async (input: ApprovedInput): Promise<Result<ApprovedOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("approved", input, iamRoleCatalogConfig);

    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    if (!input.inputResources["github-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources github-iam-role", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["aws-account"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["target-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }

    const gitHubIamRoleResult = getGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      repositoryName: input.inputResources["github-iam-role"].resourceId,
    });

    const awsAccountResult = getAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })({
      accountId: input.inputResources["aws-account"].resourceId,
    });

    const targetIamRoleResult = getTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      id: input.inputResources["target-iam-role"].resourceId,
    });

    return await ResultAsync.combine([gitHubIamRoleResult, awsAccountResult, targetIamRoleResult])
      .andThen(([gitHubIamRole, awsAccount, targetIamRole]) => {
        if (gitHubIamRole.isNone()) {
          const message = `GitHub IAM Role Resource not found: ${input.inputResources["github-iam-role"].resourceId}`;
          return err(new HandlerError(message, "BAD_REQUEST", message));
        }
        if (awsAccount.isNone()) {
          const message = `AWS Account Resource not found: ${input.inputResources["aws-account"].resourceId}`;
          return err(new HandlerError(message, "BAD_REQUEST", message));
        }
        if (targetIamRole.isNone()) {
          const message = `Target IAM Role Resource not found: ${input.inputResources["target-iam-role"].resourceId}`;
          return err(new HandlerError(message, "BAD_REQUEST", message));
        }
        return ok({ gitHubIamRole: gitHubIamRole.value, targetIamRole: targetIamRole.value });
      })
      .andThen(({ gitHubIamRole, targetIamRole }) => {
        const listAttachedRolePoliciesFunc = listIamRoleAttachedPolicyArns(logger, iamClient);
        const fetchAllAttachedRolePolicyArnsFunc = fetchAllAttachedRolePolicyArns(listAttachedRolePoliciesFunc);
        return fetchAllAttachedRolePolicyArnsFunc({
          iamRoleName: gitHubIamRole.iamRoleName,
        }).andThen((allAttachedRolePolicyArnsResult) => {
          const targetAssumeRolePolicyArn = targetIamRole.assumeRolePolicyArn;
          const attachedPolicyArns = allAttachedRolePolicyArnsResult.attachedPolicyArns;
          const filteredPolicyArns = attachedPolicyArns.filter((arn) => arn !== targetAssumeRolePolicyArn); // Exclude IAM policies that you plan to attach from the attached list.
          if (filteredPolicyArns.length >= 10) {
            const message = `Promote GitHub Repository Role request failed. The target IAM role has reached the AssumeRole limit. Please demote the repository for which you have finished using the IAM role.`;
            return err(new HandlerError(message, "BAD_REQUEST", message));
          }
          return ok({ gitHubIamRole, targetIamRole });
        });
      })
      .andThen(({ gitHubIamRole, targetIamRole }) => {
        const param = {
          sourceRoleName: gitHubIamRole.iamRoleName,
          assumeRolePolicyArn: targetIamRole.assumeRolePolicyArn,
        };
        return promoteIamRole(logger, iamClient)(param);
      })
      .map(() => {
        const message = `Promoted GitHub Repository Role.`;
        return { isSuccess: true, message };
      })
      .orElse((error) => {
        const message = error.userMessage ?? "Unexpected error occurred.";
        return ok({ isSuccess: false, message });
      });
  };

const revokedHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ApprovalFlowHandler["revoked"] =>
  async (input: RevokedInput): Promise<Result<RevokedOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("revoked", input, iamRoleCatalogConfig);

    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    if (!input.inputResources["github-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources github-iam-role", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["aws-account"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["target-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }

    const gitHubIamRoleResult = getGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      repositoryName: input.inputResources["github-iam-role"].resourceId,
    });

    const awsAccountResult = getAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })({
      accountId: input.inputResources["aws-account"].resourceId,
    });

    const targetIamRoleResult = getTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      id: input.inputResources["target-iam-role"].resourceId,
    });

    return await ResultAsync.combine([gitHubIamRoleResult, awsAccountResult, targetIamRoleResult])
      .andThen(([gitHubIamRole, awsAccount, targetIamRole]) => {
        if (gitHubIamRole.isNone()) {
          const message = `GitHub IAM Role Resource not found: ${input.inputResources["github-iam-role"].resourceId}`;
          return err(new HandlerError(message, "INTERNAL_SERVER_ERROR"));
        }
        if (awsAccount.isNone()) {
          const message = `AWS Account Resource not found: ${input.inputResources["aws-account"].resourceId}`;
          return err(new HandlerError(message, "INTERNAL_SERVER_ERROR"));
        }
        if (targetIamRole.isNone()) {
          const message = `Target IAM Role Resource not found: ${input.inputResources["target-iam-role"].resourceId}`;
          return err(new HandlerError(message, "INTERNAL_SERVER_ERROR"));
        }
        return ok({ gitHubIamRole: gitHubIamRole.value, awsAccount: awsAccount.value, targetIamRole: targetIamRole.value });
      })
      .andThen(({ gitHubIamRole, targetIamRole }) => {
        const param = {
          sourceRoleName: gitHubIamRole.iamRoleName,
          assumeRolePolicyArn: targetIamRole.assumeRolePolicyArn,
        };
        return demoteIamRole(logger, iamClient)(param);
      })
      .map(() => {
        const message = `Demoted GitHub Repository Role.`;
        return { isSuccess: true, message: message };
      })
      .orElse((error) => {
        const message = error.userMessage ?? "Unexpected error occurred.";
        return ok({ isSuccess: false, message });
      });
  };
