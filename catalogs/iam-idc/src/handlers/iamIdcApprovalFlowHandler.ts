import { ok, err, Result } from "neverthrow";
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
import { ValidateApprovalRequestInput, validateApprovalRequest } from "../workflows/approvalFlow/approvalRequestValidation";
import { approved } from "../workflows/approvalFlow/approved";
import { revoked } from "../workflows/approvalFlow/revoked";
import { IamIdcCatalogConfig } from "../config";

export function createIamIdcApplicationHandler(iamIdcCatalogConfig: IamIdcCatalogConfig): ApprovalFlowHandler {
  const iamIdcApplicationHandler: ApprovalFlowHandler = {
    approvalRequestValidation: (input: ApprovalRequestValidationInput) => approvalRequestValidationHandler(input, iamIdcCatalogConfig),
    approved: (input: ApprovedInput) => approvedHandler(input, iamIdcCatalogConfig),
    revoked: (input: RevokedInput) => revokedHandler(input, iamIdcCatalogConfig),
  };

  return iamIdcApplicationHandler;
}

async function approvalRequestValidationHandler(
  input: ApprovalRequestValidationInput,
  iamIdcCatalogConfig: IamIdcCatalogConfig
): Promise<Result<ApprovalRequestValidationOutput, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("approvalRequestValidation", input, iamIdcCatalogConfig);

  if (typeof input.inputParams.userName.value !== "string") {
    return err(new HandlerError("Invalid input parameters(userName.value)", "INTERNAL_SERVER_ERROR"));
  }

  const param: ValidateApprovalRequestInput = {
    permissionId: input.inputResources["iam-idc-permission"].resourceId,
    userName: input.inputParams.userName.value,
  };

  const result = await validateApprovalRequest(logger, iamIdcCatalogConfig)(param);

  return ok(result);
}

async function approvedHandler(input: ApprovedInput, iamIdcCatalogConfig: IamIdcCatalogConfig): Promise<Result<ApprovedOutput, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("approved", input, iamIdcCatalogConfig);

  if (typeof input.inputParams.userName.value !== "string") {
    return err(new HandlerError("Invalid input parameters(userName.value)", "INTERNAL_SERVER_ERROR"));
  }

  const permissionId: string = input.inputResources["iam-idc-permission"].resourceId;
  const param = {
    permissionId: permissionId,
    userName: input.inputParams.userName.value,
  };

  const result = await approved(logger, iamIdcCatalogConfig)(param);
  return ok(result);
}

async function revokedHandler(input: RevokedInput, iamIdcCatalogConfig: IamIdcCatalogConfig): Promise<Result<RevokedOutput, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("revoked", input, iamIdcCatalogConfig);

  if (typeof input.inputParams.userName.value !== "string") {
    return err(new HandlerError("Invalid input parameters(userName.value)", "INTERNAL_SERVER_ERROR"));
  }

  const permissionId: string = input.inputResources["iam-idc-permission"].resourceId;
  const param = {
    permissionId: permissionId,
    userName: input.inputParams.userName.value,
  };

  const result = await revoked(logger, iamIdcCatalogConfig)(param);

  return ok(result);
}
