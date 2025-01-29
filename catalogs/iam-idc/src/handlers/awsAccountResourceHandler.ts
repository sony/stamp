import { ok, err, Result } from "neverthrow";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import {
  ResourceHandlers,
  CreateResourceInput,
  DeleteResourceInput,
  GetResourceInput,
  UpdateResourceInput,
  ListResourcesInput,
  ListResourceAuditItemInput,
  ResourceOutput,
  ListResourcesOutput,
  ListResourceAuditItemOutput,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { createLogger } from "@stamp-lib/stamp-logger";
import { registerAwsAccount, RegisterAwsAccountInput } from "../workflows/awsAccount/registerAwsAccount";
import { unregisterAwsAccount, UnregisterAwsAccountInput } from "../workflows/awsAccount/unregisterAwsAccount";
import { getAwsAccountInfo } from "../workflows/awsAccount/getAwsAccountInfo";
import { updateAwsAccountInfo } from "../workflows/awsAccount/updateAwsAccountInfo";
import { listAwsAccountInfo } from "../workflows/awsAccount/listAwsAccountInfo";
import { listAuditItem } from "../workflows/awsAccount/listAuditItem";
import { some, Option, none } from "@stamp-lib/stamp-option";
import { IamIdcCatalogConfig } from "../config";
import z from "zod";

export function createAwsAccountResourceHandler(iamIdcCatalogConfig: IamIdcCatalogConfig): ResourceHandlers {
  const awsAccountResourceHandler: ResourceHandlers = {
    createResource: (input: CreateResourceInput) => createResourceHandler(input, iamIdcCatalogConfig),
    deleteResource: (input: DeleteResourceInput) => deleteResourceHandler(input, iamIdcCatalogConfig),
    getResource: (input: DeleteResourceInput) => getResourceHandler(input, iamIdcCatalogConfig),
    updateResource: (input: UpdateResourceInput) => updateResourceHandler(input, iamIdcCatalogConfig),
    listResources: (input: ListResourcesInput) => listResourcesHandler(input, iamIdcCatalogConfig),
    listResourceAuditItem: (input: ListResourceAuditItemInput) => listResourceAuditItemHandler(input, iamIdcCatalogConfig),
  };

  return awsAccountResourceHandler;
}

async function createResourceHandler(input: CreateResourceInput, iamIdcCatalogConfig: IamIdcCatalogConfig): Promise<Result<ResourceOutput, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("createResource", input, iamIdcCatalogConfig);

  if (typeof input.inputParams.accountId !== "string") {
    return err(new HandlerError("Invalid input parameters(accountId)", "INTERNAL_SERVER_ERROR"));
  }

  if (typeof input.inputParams.name !== "string") {
    return err(new HandlerError("Invalid input parameters(name)", "INTERNAL_SERVER_ERROR"));
  }

  const inputParam = input.inputParams;
  const parsedResult = RegisterAwsAccountInput.safeParse(inputParam);
  if (!parsedResult.success) {
    const message = `Invalid input parameters:${parsedResult.error.toString()}`;
    return err(new HandlerError(message, "BAD_REQUEST", message));
  }

  const result = await registerAwsAccount(logger, iamIdcCatalogConfig)(parsedResult.data);
  if (result.isErr()) {
    logger.error("registerAwsAccount", result.error);
    return err(new HandlerError(`Failed to create resource: ${result.error}`, "INTERNAL_SERVER_ERROR"));
  }

  return ok({
    name: result.value.name,
    resourceId: result.value.accountId,
    params: {
      accountId: result.value.accountId,
    },
  });
}

async function deleteResourceHandler(input: DeleteResourceInput, iamIdcCatalogConfig: IamIdcCatalogConfig): Promise<Result<void, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("deleteResource", input, iamIdcCatalogConfig);

  const parsedResult = UnregisterAwsAccountInput.safeParse({
    accountId: input.resourceId,
  });
  if (!parsedResult.success) {
    const message = `Invalid input parameters:${parsedResult.error.toString()}`;
    return err(new HandlerError(message, "BAD_REQUEST", message));
  }

  const result = await unregisterAwsAccount(logger, iamIdcCatalogConfig)(parsedResult.data);
  if (result.isErr()) {
    logger.error("unregisterAwsAccount", result.error);
    return err(new HandlerError(`Failed to delete resource: ${result.error}`, "INTERNAL_SERVER_ERROR"));
  }

  return ok(void 0);
}

async function getResourceHandler(input: GetResourceInput, iamIdcCatalogConfig: IamIdcCatalogConfig): Promise<Result<Option<ResourceOutput>, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("getResource", input, iamIdcCatalogConfig);

  const parsedResult = UnregisterAwsAccountInput.safeParse({
    accountId: input.resourceId,
  });
  if (!parsedResult.success) {
    const message = `Invalid input parameters:${parsedResult.error.toString()}`;
    return err(new HandlerError(message, "BAD_REQUEST", message));
  }

  const result = await getAwsAccountInfo(logger, iamIdcCatalogConfig)(parsedResult.data);
  if (result.isErr()) {
    logger.error("getAwsAccountInfo", result.error);
    return err(new HandlerError(`Failed to get resource: ${result.error}`, "INTERNAL_SERVER_ERROR"));
  }
  return result.andThen((awsAccountInfo) => {
    if (awsAccountInfo.isNone()) {
      return ok(none);
    }
    return ok(
      some({
        name: awsAccountInfo.value.name,
        resourceId: awsAccountInfo.value.accountId,
        params: {
          accountId: awsAccountInfo.value.accountId,
        },
        parentResourceId: undefined,
      })
    );
  });
}

async function updateResourceHandler(input: UpdateResourceInput, iamIdcCatalogConfig: IamIdcCatalogConfig): Promise<Result<ResourceOutput, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("updateResource", input, iamIdcCatalogConfig);

  if (typeof input.updateParams.name !== "string") {
    return err(new HandlerError("Invalid input parameters(name)", "INTERNAL_SERVER_ERROR"));
  }

  if (typeof input.updateParams.accountId !== "string") {
    return err(new HandlerError("Invalid input parameters(accountId)", "INTERNAL_SERVER_ERROR"));
  }

  const updateParam = input.updateParams;
  const parsedResult = RegisterAwsAccountInput.safeParse(updateParam);
  if (!parsedResult.success) {
    const message = `Invalid input parameters:${parsedResult.error.toString()}`;
    return err(new HandlerError(message, "BAD_REQUEST", message));
  }

  const result = await updateAwsAccountInfo(logger, iamIdcCatalogConfig)(parsedResult.data);
  if (result.isErr()) {
    logger.error("updateAwsAccountInfo", result.error);
    return err(new HandlerError(`Failed to update resource: ${result.error}`, "INTERNAL_SERVER_ERROR"));
  }

  return ok({
    name: result.value.name,
    resourceId: result.value.accountId,
    params: {
      accountId: result.value.accountId,
    },
    parentResourceId: undefined,
  });
}

async function listResourcesHandler(input: ListResourcesInput, iamIdcCatalogConfig: IamIdcCatalogConfig): Promise<Result<ListResourcesOutput, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("listResource", input, iamIdcCatalogConfig);

  const result = await listAwsAccountInfo(logger, iamIdcCatalogConfig)();
  if (result.isErr()) {
    logger.error("listAwsAccountInfo", result.error);
    return err(new HandlerError(`Failed to list resources: ${result.error}`, "INTERNAL_SERVER_ERROR"));
  }

  const listAwsAccount = result.value;
  const resources = listAwsAccount.map((awsAccount) => ({
    name: awsAccount.name,
    resourceId: awsAccount.accountId,
    params: {
      accountId: awsAccount.accountId,
    },
    parentResourceId: undefined,
  }));

  return ok({ resources: resources, paginationToken: undefined });
}

const ListAwsAccountInput = z.object({
  accountId: z.string().refine((value) => !isNaN(Number(value)) && value.length === 12, {
    message: "accountId must be a 12-digit number",
  }),
  nextToken: z.string().optional(),
  limit: z.number().optional(),
});
type ListAwsAccountInput = z.infer<typeof ListAwsAccountInput>;

async function listResourceAuditItemHandler(
  input: ListResourceAuditItemInput,
  iamIdcCatalogConfig: IamIdcCatalogConfig
): Promise<Result<ListResourceAuditItemOutput, HandlerError>> {
  const logger = createLogger(iamIdcCatalogConfig.logLevel, { moduleName: "iam-idc" });
  logger.info("listResourceAuditItem", input, iamIdcCatalogConfig);

  const parsedResult = ListAwsAccountInput.safeParse({
    accountId: input.resourceId,
    nextToken: input.paginationToken,
    limit: input.limit,
  });
  if (!parsedResult.success) {
    const message = `Invalid input parameters:${parsedResult.error.toString()}`;
    return err(new HandlerError(message, "BAD_REQUEST", message));
  }

  const result = await listAuditItem(logger, iamIdcCatalogConfig)(parsedResult.data);
  if (result.isErr()) {
    return err(new HandlerError(`Failed to list of audit item resources: ${result.error}`, "INTERNAL_SERVER_ERROR"));
  }

  const listAuditItems = result.value;
  const auditItems = listAuditItems.items.map((auditItem) => ({
    type: "permission" as const,
    name: auditItem.name,
    values: auditItem.values,
  }));

  return ok({ auditItems: auditItems, paginationToken: listAuditItems.nextToken });
}
