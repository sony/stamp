import {
  CreateResourceInput,
  GetResourceInput,
  HandlerError,
  ListResourceAuditItemInput,
  ListResourceAuditItemOutput,
  ListResourcesInput,
  ResourceHandlers,
  ResourceOutput,
  UpdateResourceInput,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { Result, err, ok } from "neverthrow";

import { createLogger } from "@stamp-lib/stamp-logger";
import { Option, some } from "@stamp-lib/stamp-option";
import { IamIdcCatalogConfig } from "../config";
import { CreatePermissionInput, createPermission } from "../workflows/permission/createPermission";
import { deletePermission } from "../workflows/permission/deletePermission";
import { GetPermissionInput, getPermission } from "../workflows/permission/getPermission";
import { listOfAuditItem } from "../workflows/permission/listAuditItem";
import { ListPermissionInput, listPermission } from "../workflows/permission/listPermission";
import { updatePermission } from "../workflows/permission/updatePermission";
import { UpdatePermissionInput } from "../types/permission";

export function createIamIdcPermissionResourceHandler(iamIdcCatalogConfig: IamIdcCatalogConfig): ResourceHandlers {
  const iamIdcPermissionResourceHandler: ResourceHandlers = {
    createResource: createResourceHandler(iamIdcCatalogConfig),
    deleteResource: deleteResourceHandler(iamIdcCatalogConfig),
    getResource: getResourceHandler(iamIdcCatalogConfig),
    updateResource: updateResourceHandler(iamIdcCatalogConfig),
    listResources: listResourcesHandler(iamIdcCatalogConfig),
    listResourceAuditItem: (input: ListResourceAuditItemInput) => listResourceAuditItemHandler(input, iamIdcCatalogConfig),
  };

  return iamIdcPermissionResourceHandler;
}

const createResourceHandler =
  (iamIdcCatalogConfig: IamIdcCatalogConfig): ResourceHandlers["createResource"] =>
  async (input: CreateResourceInput): Promise<Result<ResourceOutput, HandlerError>> => {
    const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
    logger.info("createResource", input, iamIdcCatalogConfig);

    const inputParam = input.inputParams;
    const parsedResult = CreatePermissionInput.pick({
      name: true,
      description: true,
      customIamPolicyNames: true,
      managedIamPolicyNames: true,
      sessionDuration: true,
      permissionSetNameId: true,
    }).safeParse(inputParam);
    if (!parsedResult.success) {
      const message = `Invalid input parameters:${parsedResult.error.toString()}`;
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }

    if (typeof input.parentResourceId !== "string") {
      return err(new HandlerError("Invalid parentResourceId", "BAD_REQUEST"));
    }

    // customIamPolicyNames and managedIamPolicyNames is limited to 10.
    // Because default number of AWS managed and customer managed policies in IAM Identity Center per permission set is 10.
    const totalPolicyNames = (parsedResult.data.customIamPolicyNames?.length || 0) + (parsedResult.data.managedIamPolicyNames?.length || 0);
    if (totalPolicyNames > 10) {
      return err(new HandlerError("The total number of customIamPolicyNames and managedIamPolicyNames cannot exceed 10", "BAD_REQUEST"));
    }

    const awsAccountId = input.parentResourceId;

    const createPermissionParam: CreatePermissionInput = {
      ...parsedResult.data,
      awsAccountId: awsAccountId,
    };

    const result = await createPermission(logger, iamIdcCatalogConfig)(createPermissionParam);
    if (result.isErr()) {
      logger.error("Failed to create resource", result.error);
      const message = `Failed to create resource: ${(result.error as Error).message ?? ""}`;
      return err(new HandlerError(message, "INTERNAL_SERVER_ERROR", message));
    }

    return ok({
      name: result.value.name,
      resourceId: result.value.permissionId,
      params: {
        description: result.value.description,
        sessionDuration: result.value.sessionDuration,
        permissionSetNameId: result.value.permissionSetNameId,
        managedIamPolicyNames: result.value.managedIamPolicyNames,
        customIamPolicyNames: result.value.customIamPolicyNames,
      },
    });
  };

const deleteResourceHandler =
  (iamIdcCatalogConfig: IamIdcCatalogConfig): ResourceHandlers["deleteResource"] =>
  async (input): Promise<Result<void, HandlerError>> => {
    const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
    logger.info("deleteResource", input, iamIdcCatalogConfig);

    const param = {
      permissionId: input.resourceId,
    };

    const result = await deletePermission(logger, iamIdcCatalogConfig)(param);
    if (result.isErr()) {
      return err(new HandlerError(`Failed to delete resource: ${result.error}`, "INTERNAL_SERVER_ERROR"));
    }

    return ok(void 0);
  };

const getResourceHandler =
  (iamIdcCatalogConfig: IamIdcCatalogConfig): ResourceHandlers["getResource"] =>
  async (input: GetResourceInput): Promise<Result<Option<ResourceOutput>, HandlerError>> => {
    const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
    logger.info("getResource", input, iamIdcCatalogConfig);

    const param: GetPermissionInput = {
      permissionId: input.resourceId, // permissionId is Stamp resource id
    };

    return await getPermission(
      logger,
      iamIdcCatalogConfig
    )(param).map((result) => {
      return some({
        name: result.name,
        resourceId: result.permissionId,
        params: {
          description: result.description,
          sessionDuration: result.sessionDuration,
          permissionSetNameId: result.permissionSetNameId,
          managedIamPolicyNames: result.managedIamPolicyNames,
          customIamPolicyNames: result.customIamPolicyNames,
        },
        parentResourceId: result.awsAccountId,
      });
    });
  };

const listResourcesHandler =
  (iamIdcCatalogConfig: IamIdcCatalogConfig): ResourceHandlers["listResources"] =>
  async (input: ListResourcesInput) => {
    const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
    logger.info("listResources", input, iamIdcCatalogConfig);

    const inputParam: ListPermissionInput = {
      awsAccountId: input.parentResourceId,
      namePrefix: input.prefix?.type == "name" ? input.prefix?.value : undefined,
      nextToken: input.paginationToken,
    };

    const result = await listPermission(logger, iamIdcCatalogConfig)(inputParam);
    if (result.isErr()) {
      return err(new HandlerError(`Failed to list resources: ${result.error}`, "INTERNAL_SERVER_ERROR"));
    }

    const resources = result.value.items.map((item) => ({
      name: item.name,
      resourceId: item.permissionId,
      params: {
        description: item.description,
        sessionDuration: item.sessionDuration,
        permissionSetNameId: item.permissionSetNameId,
        managedIamPolicyNames: item.managedIamPolicyNames,
        customIamPolicyNames: item.customIamPolicyNames,
      },
      parentResourceId: item.awsAccountId,
    }));

    return ok({ resources: resources, paginationToken: result.value.nextToken });
  };

async function listResourceAuditItemHandler(
  input: ListResourceAuditItemInput,
  iamIdcCatalogConfig: IamIdcCatalogConfig
): Promise<Result<ListResourceAuditItemOutput, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("listResourceAuditItem", input, iamIdcCatalogConfig);

  const param = {
    permissionId: input.resourceId,
    nextToken: input.paginationToken,
    limit: input.limit,
  };

  const result = await listOfAuditItem(logger, iamIdcCatalogConfig)(param);
  if (result.isErr()) {
    return err(new HandlerError(`Failed to list of audit item resources: ${result.error}`, "INTERNAL_SERVER_ERROR"));
  }

  return ok({ auditItems: [{ ...result.value, type: "permission" }], paginationToken: result.value.nextToken });
}

const updateResourceHandler =
  (iamIdcCatalogConfig: IamIdcCatalogConfig): ResourceHandlers["updateResource"] =>
  async (input: UpdateResourceInput): Promise<Result<ResourceOutput, HandlerError>> => {
    const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
    logger.info("updateResource", input, iamIdcCatalogConfig);

    // Parse and validate the update parameters
    const parsedResult = UpdatePermissionInput.pick({
      description: true,
      sessionDuration: true,
      managedIamPolicyNames: true,
      customIamPolicyNames: true,
    }).safeParse(input.updateParams);

    if (!parsedResult.success) {
      const message = `Invalid input parameters: ${parsedResult.error.toString()}`;
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }

    // Validate policy limits
    const totalPolicyNames = (parsedResult.data.customIamPolicyNames?.length || 0) + (parsedResult.data.managedIamPolicyNames?.length || 0);
    if (totalPolicyNames > 10) {
      return err(new HandlerError("The total number of customIamPolicyNames and managedIamPolicyNames cannot exceed 10", "BAD_REQUEST"));
    }

    const updatePermissionParam: UpdatePermissionInput = {
      permissionId: input.resourceId,
      ...parsedResult.data,
    };

    const result = await updatePermission(logger, iamIdcCatalogConfig)(updatePermissionParam);
    if (result.isErr()) {
      logger.error("Failed to update resource", result.error);
      const message = `Failed to update resource: ${(result.error as Error).message ?? ""}`;
      return err(new HandlerError(message, "INTERNAL_SERVER_ERROR", message));
    }

    return ok({
      name: result.value.name,
      resourceId: result.value.permissionId,
      params: {
        description: result.value.description,
        sessionDuration: result.value.sessionDuration,
        permissionSetNameId: result.value.permissionSetNameId,
        managedIamPolicyNames: result.value.managedIamPolicyNames,
        customIamPolicyNames: result.value.customIamPolicyNames,
      },
    });
  };
