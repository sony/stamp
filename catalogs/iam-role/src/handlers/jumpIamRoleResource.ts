import { IAMClient } from "@aws-sdk/client-iam";
import { createLogger } from "@stamp-lib/stamp-logger";
import { Option, none, some } from "@stamp-lib/stamp-option";
import {
  CreateResourceInput,
  DeleteResourceInput,
  GetResourceInput,
  HandlerError,
  ListResourceAuditItemInput,
  ListResourceAuditItemOutput,
  ListResourcesInput,
  ListResourcesOutput,
  ResourceHandlers,
  ResourceOutput,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { Result, err, ok } from "neverthrow";
import { IamRoleCatalogConfig } from "../config";
import { createJumpIamRoleDBItem, deleteJumpIamRoleDBItem, getJumpIamRoleDBItem, listJumpIamRoleDBItem } from "../events/database/jumpIamRoleDB";
import { listIamRoleAttachedPolicyArns, fetchAllAttachedRolePolicyArns } from "../events/iam-ops/iamRoleManagement";
import { createJumpIamRoleInAws, createJumpIamRoleName, deleteJumpIamRoleInAws, listJumpIamRoleAuditItemInAws } from "../events/resource/jumpIamRole";
import { assumeRoleCredentialProvider } from "../utils/assumeRoleCredentialProvider";

export function createJumpIamRoleResourceHandler(iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers {
  const jumpIamRoleResourceHandler: ResourceHandlers = {
    createResource: createResourceHandler(iamRoleCatalogConfig),
    deleteResource: deleteResourceHandler(iamRoleCatalogConfig),
    getResource: getResourceHandler(iamRoleCatalogConfig),
    updateResource: async () => {
      return err(new HandlerError("Not implemented", "INTERNAL_SERVER_ERROR", "Not implemented"));
    },
    listResources: listResourcesHandler(iamRoleCatalogConfig),
    listResourceAuditItem: listResourceAuditItemHandler(iamRoleCatalogConfig),
  };

  return jumpIamRoleResourceHandler;
}

const createResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["createResource"] =>
  async (input: CreateResourceInput): Promise<Result<ResourceOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("createResource", input, iamRoleCatalogConfig);

    if (typeof input.inputParams.jumpIamRoleName !== "string" || input.inputParams.jumpIamRoleName.trim() === "") {
      return err(new HandlerError("Invalid input parameters(jumpIamRoleName)", "BAD_REQUEST", "Invalid input parameters(jumpIamRoleName)"));
    }

    if (typeof input.inputParams.originIamRoleArn !== "string" || input.inputParams.originIamRoleArn.trim() === "") {
      return err(new HandlerError("Invalid input parameters(originIamRoleArn)", "BAD_REQUEST", "Invalid input parameters(originIamRoleArn)"));
    }

    // If it has already been created, an error indicating "already created" will be returned.
    const result = await getJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      jumpIamRoleName: input.inputParams.jumpIamRoleName,
    });
    if (result.isErr()) {
      return err(new HandlerError(`${result.error}`, "INTERNAL_SERVER_ERROR"));
    }
    if (result.isOk() && result.value.isSome()) {
      const jumpIamRole = result.value.unwrapOr();
      const message = `The IAM role name ${jumpIamRole.jumpIamRoleName} is already in use. Please specify another name.`;
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }

    const createInput = {
      jumpIamRoleName: input.inputParams.jumpIamRoleName,
      originIamRoleArn: input.inputParams.originIamRoleArn,
    };

    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    return await createJumpIamRoleName(iamRoleCatalogConfig)(createInput)
      .asyncAndThen(createJumpIamRoleInAws(logger, iamRoleCatalogConfig, iamClient))
      .andThen(createJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region }))
      .map((result) => {
        return {
          resourceId: result.jumpIamRoleName,
          name: result.jumpIamRoleName,
          params: {
            jumpIamRoleName: result.jumpIamRoleName,
            originIamRoleArn: result.originIamRoleArn,
            iamRoleArn: result.iamRoleArn,
          },
        };
      });
  };

const deleteResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["deleteResource"] =>
  async (input: DeleteResourceInput): Promise<Result<void, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("deleteResource", input, iamRoleCatalogConfig);

    const deleteInput = {
      jumpIamRoleName: input.resourceId,
    };
    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    return await getJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(deleteInput)
      .andThen((result) => {
        if (result.isNone()) {
          const message = `Resource ${input.resourceId} Not exist`;
          return err(new HandlerError(message, "BAD_REQUEST", message));
        } else {
          return ok(result.value);
        }
      })
      .andThen(deleteJumpIamRoleInAws(logger, iamClient))
      .andThen(deleteJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region }))
      .map(() => {});
  };

const getResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["getResource"] =>
  async (input: GetResourceInput): Promise<Result<Option<ResourceOutput>, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("getResource", input, iamRoleCatalogConfig);

    const getInput = {
      jumpIamRoleName: input.resourceId,
    };

    return await getJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(getInput).map(
      (result) => {
        if (result.isNone()) {
          return none;
        } else {
          return some({
            resourceId: result.value.jumpIamRoleName,
            name: result.value.jumpIamRoleName,
            params: {
              jumpIamRoleName: result.value.jumpIamRoleName,
              originIamRoleArn: result.value.originIamRoleArn,
              iamRoleArn: result.value.iamRoleArn,
            },
          });
        }
      }
    );
  };

const listResourcesHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["listResources"] =>
  async (input: ListResourcesInput): Promise<Result<ListResourcesOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("listResources", input, iamRoleCatalogConfig);

    const listInput = {
      namePrefix: input.prefix?.type === "name" ? input.prefix.value : undefined,
      nextToken: input.paginationToken,
    };

    return await listJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(listInput).map(
      (result) => {
        return {
          resources: result.items.map((item) => {
            return {
              resourceId: item.jumpIamRoleName,
              name: item.jumpIamRoleName,
              params: {
                jumpIamRoleName: item.jumpIamRoleName,
                originIamRoleArn: item.originIamRoleArn,
                iamRoleArn: item.iamRoleArn,
              },
            };
          }),
          nextToken: result.nextToken,
        };
      }
    );
  };

const listResourceAuditItemHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["listResourceAuditItem"] =>
  async (input: ListResourceAuditItemInput): Promise<Result<ListResourceAuditItemOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("listResourceAuditItem", input, iamRoleCatalogConfig);

    const getInput = {
      jumpIamRoleName: input.resourceId,
    };
    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    return getJumpIamRoleDBItem(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(getInput)
      .andThen((result) => {
        if (result.isNone()) {
          const message = `Resource ${input.resourceId} does not exist`;
          return err(new HandlerError(message, "BAD_REQUEST", message));
        } else {
          return ok(result.value);
        }
      })
      .andThen((result) => {
        const listAttachedRolePoliciesFunc = listIamRoleAttachedPolicyArns(logger, iamClient);
        return fetchAllAttachedRolePolicyArns(listAttachedRolePoliciesFunc)({ iamRoleName: result.iamRoleName });
      })
      .andThen(listJumpIamRoleAuditItemInAws(logger, iamClient))
      .map((result) => {
        return {
          auditItems: result.items.map((auditItem) => {
            return {
              type: "permission" as const,
              name: "IAM Role that allows AssumeRole",
              values: [auditItem],
            };
          }),
        };
      });
  };
