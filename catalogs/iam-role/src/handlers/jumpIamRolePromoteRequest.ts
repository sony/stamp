import { createLogger } from "@stamp-lib/stamp-logger";
import {
  ApprovalFlowHandler,
  ApprovalRequestValidationInput,
  ApprovalRequestValidationOutput,
  ApprovedInput,
  ApprovedOutput,
  HandlerError,
  RevokedInput,
  RevokedOutput,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { Result, ResultAsync, err, ok } from "neverthrow";
import { getAwsAccountDBItem } from "../events/database/awsAccountDB";
import { getJumpIamRoleDBItem } from "../events/database/jumpIamRoleDB";
import { getTargetIamRoleDBItem } from "../events/database/targetIamRoleDB";

import { demoteIamRole, promoteIamRole, listIamRoleAttachedPolicyArns, fetchAllAttachedRolePolicyArns } from "../events/iam-ops/iamRoleManagement";

import { IamRoleCatalogConfig } from "../config";

import { IAMClient } from "@aws-sdk/client-iam";
import { assumeRoleCredentialProvider } from "../utils/assumeRoleCredentialProvider";

export function createJumpIamRolePromoteRequestHandler(iamRoleCatalogConfig: IamRoleCatalogConfig): ApprovalFlowHandler {
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

    if (!input.inputResources["jump-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources jump-iam-role", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["aws-account"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["target-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }

    const jumpIamRoleResult = getJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      jumpIamRoleName: input.inputResources["jump-iam-role"].resourceId,
    });

    const awsAccountResult = getAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })({
      accountId: input.inputResources["aws-account"].resourceId,
    });

    const targetIamRoleResult = getTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      id: input.inputResources["target-iam-role"].resourceId,
    });

    const result = await ResultAsync.combine([jumpIamRoleResult, awsAccountResult, targetIamRoleResult]).map(([jumpIamRole, awsAccount, targetIamRole]) => {
      if (jumpIamRole.isNone()) {
        const message = `Jump IAM Role Resource not found: ${input.inputResources["jump-iam-role"].resourceId}`;
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
      const message = `Promote Jump IAM Role request.\n Jump IAM Role Name: ${jumpIamRole.value.jumpIamRoleName}\n AWS Account: ${awsAccount.value.name}(${awsAccount.value.accountId})\n Target IAM Role: ${targetIamRole.value.iamRoleName}`;
      return { isSuccess: true, message, targetIamRole: targetIamRole.value, jumpIamRole: jumpIamRole.value };
    });

    if (result.isErr()) {
      return result;
    }

    if (result.isOk() && result.value.isSuccess === false) {
      return ok({ isSuccess: false, message: result.value.message });
    }

    if (!result.value.jumpIamRole) {
      return err(new HandlerError("Invalid input inputResources jumpIamRole", "INTERNAL_SERVER_ERROR"));
    }

    const listAttachedRolePoliciesFunc = listIamRoleAttachedPolicyArns(logger, iamClient);
    const fetchAllAttachedRolePolicyArnsFunc = fetchAllAttachedRolePolicyArns(listAttachedRolePoliciesFunc);
    const allAttachedRolePolicyArnsResult = await fetchAllAttachedRolePolicyArnsFunc({
      iamRoleName: result.value.jumpIamRole?.iamRoleName,
    });

    if (allAttachedRolePolicyArnsResult.isErr()) {
      const message = `Promote Jump IAM Role request failed. ${allAttachedRolePolicyArnsResult.error.message}`;
      logger.error(message);
      return ok({ isSuccess: false, message });
    }

    const targetAssumeRolePolicyArn = result.value.targetIamRole?.assumeRolePolicyArn;
    const attachedPolicyArns = allAttachedRolePolicyArnsResult.value.attachedPolicyArns;
    const filteredPolicyArns = attachedPolicyArns.filter((arn) => arn !== targetAssumeRolePolicyArn); // Exclude IAM policies that you plan to attach from the attached list.
    if (filteredPolicyArns.length >= 10) {
      const message = `Promote Jump IAM Role request failed. The target IAM role has reached the AssumeRole limit. Please demote the jump IAM role for which you have finished using the IAM role.`;
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

    if (!input.inputResources["jump-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources jump-iam-role", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["aws-account"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["target-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }

    const jumpIamRoleResult = getJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      jumpIamRoleName: input.inputResources["jump-iam-role"].resourceId,
    });

    const awsAccountResult = getAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })({
      accountId: input.inputResources["aws-account"].resourceId,
    });

    const targetIamRoleResult = getTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      id: input.inputResources["target-iam-role"].resourceId,
    });

    return await ResultAsync.combine([jumpIamRoleResult, awsAccountResult, targetIamRoleResult])
      .andThen(([jumpIamRole, awsAccount, targetIamRole]) => {
        if (jumpIamRole.isNone()) {
          const message = `Jump IAM Role Resource not found: ${input.inputResources["jump-iam-role"].resourceId}`;
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
        return ok({ jumpIamRole: jumpIamRole.value, targetIamRole: targetIamRole.value });
      })
      .andThen(({ jumpIamRole, targetIamRole }) => {
        const listAttachedRolePoliciesFunc = listIamRoleAttachedPolicyArns(logger, iamClient);
        const fetchAllAttachedRolePolicyArnsFunc = fetchAllAttachedRolePolicyArns(listAttachedRolePoliciesFunc);
        return fetchAllAttachedRolePolicyArnsFunc({
          iamRoleName: jumpIamRole.iamRoleName,
        }).andThen((listJumpIamRoleAuditItemResult) => {
          const targetAssumeRolePolicyArn = targetIamRole.assumeRolePolicyArn;
          const attachedPolicyArns = listJumpIamRoleAuditItemResult.attachedPolicyArns;
          const filteredPolicyArns = attachedPolicyArns.filter((arn) => arn !== targetAssumeRolePolicyArn); // Exclude IAM policies that you plan to attach from the attached list.
          if (filteredPolicyArns.length >= 10) {
            const message = `Promote Jump IAM Role request failed. The target IAM role has reached the AssumeRole limit. Please demote the jump IAM role for which you have finished using the IAM role.`;
            return err(new HandlerError(message, "BAD_REQUEST", message));
          }
          return ok({ jumpIamRole, targetIamRole });
        });
      })
      .andThen(({ jumpIamRole, targetIamRole }) => {
        const param = {
          sourceRoleName: jumpIamRole.iamRoleName,
          assumeRolePolicyArn: targetIamRole.assumeRolePolicyArn,
        };
        return promoteIamRole(logger, iamClient)(param);
      })
      .map(() => {
        const message = `Promoted Jump IAM Role.`;
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

    if (!input.inputResources["jump-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources jump-iam-role", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["aws-account"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }
    if (!input.inputResources["target-iam-role"]) {
      return err(new HandlerError("Invalid input inputResources iam-idc-permission", "INTERNAL_SERVER_ERROR"));
    }

    const jumpIamRoleResult = getJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      jumpIamRoleName: input.inputResources["jump-iam-role"].resourceId,
    });

    const awsAccountResult = getAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })({
      accountId: input.inputResources["aws-account"].resourceId,
    });

    const targetIamRoleResult = getTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      id: input.inputResources["target-iam-role"].resourceId,
    });

    return await ResultAsync.combine([jumpIamRoleResult, awsAccountResult, targetIamRoleResult])
      .andThen(([jumpIamRole, awsAccount, targetIamRole]) => {
        if (jumpIamRole.isNone()) {
          const message = `Jump IAM Role Resource not found: ${input.inputResources["jump-iam-role"].resourceId}`;
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
        return ok({ jumpIamRole: jumpIamRole.value, awsAccount: awsAccount.value, targetIamRole: targetIamRole.value });
      })
      .andThen(({ jumpIamRole, targetIamRole }) => {
        const param = {
          sourceRoleName: jumpIamRole.iamRoleName,
          assumeRolePolicyArn: targetIamRole.assumeRolePolicyArn,
        };
        return demoteIamRole(logger, iamClient)(param);
      })
      .map(() => {
        const message = `Demoted Jump IAM Role.`;
        return { isSuccess: true, message: message };
      })
      .orElse((error) => {
        const message = error.userMessage ?? "Unexpected error occurred.";
        return ok({ isSuccess: false, message });
      });
  };
