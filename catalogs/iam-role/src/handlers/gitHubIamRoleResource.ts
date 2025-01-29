import { ok, err, Result } from "neverthrow";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import {
  ResourceHandlers,
  CreateResourceInput,
  DeleteResourceInput,
  GetResourceInput,
  ListResourcesInput,
  ResourceOutput,
  ListResourcesOutput,
  ListResourceAuditItemInput,
  ListResourceAuditItemOutput,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { createLogger } from "@stamp-lib/stamp-logger";
import { some, Option, none } from "@stamp-lib/stamp-option";
import { IAMClient } from "@aws-sdk/client-iam";
import { IamRoleCatalogConfig } from "../config";
import { getGitHubIamRoleDBItem, listGitHubIamRoleDBItem, createGitHubIamRoleDBItem, deleteGitHubIamRoleDBItem } from "../events/database/gitHubIamRoleDB";
import { createGitHubIamRoleInAws, createGitHubIamRoleName, deleteGitHubIamRoleInAws, listGitHubIamRoleAuditItemInAws } from "../events/resource/gitHubIamRole";
import { listIamRoleAttachedPolicyArns, fetchAllAttachedRolePolicyArns } from "../events/iam-ops/iamRoleManagement";
import { assumeRoleCredentialProvider } from "../utils/assumeRoleCredentialProvider";

export function createGitHubIamRoleResourceHandler(iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers {
  const gitHubIamRoleResourceHandler: ResourceHandlers = {
    createResource: createResourceHandler(iamRoleCatalogConfig),
    deleteResource: deleteResourceHandler(iamRoleCatalogConfig),
    getResource: getResourceHandler(iamRoleCatalogConfig),
    updateResource: async () => {
      return err(new HandlerError("Not implemented", "INTERNAL_SERVER_ERROR", "Not implemented"));
    },
    listResources: listResourcesHandler(iamRoleCatalogConfig),
    listResourceAuditItem: listResourceAuditItemHandler(iamRoleCatalogConfig),
  };

  return gitHubIamRoleResourceHandler;
}

const createResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["createResource"] =>
  async (input: CreateResourceInput): Promise<Result<ResourceOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("createResource", input, iamRoleCatalogConfig);

    if (typeof input.inputParams.repositoryName !== "string" || input.inputParams.repositoryName.trim() === "") {
      return err(new HandlerError("Invalid input parameters(repositoryName)", "BAD_REQUEST", "Invalid input parameters(repositoryName)"));
    }

    // If it has already been created, an error indicating "already created" will be returned.
    const result = await getGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      repositoryName: input.inputParams.repositoryName,
    });
    if (result.isErr()) {
      return err(new HandlerError(`${result.error}`, "INTERNAL_SERVER_ERROR"));
    }
    if (result.isOk() && result.value.isSome()) {
      const gitHubIamRole = result.value.unwrapOr();
      const message = `The GitHub IAM role for ${gitHubIamRole.repositoryName} already exists.`;
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }

    const createInput = {
      repositoryName: input.inputParams.repositoryName,
    };

    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    return await createGitHubIamRoleName(iamRoleCatalogConfig)(createInput)
      .asyncAndThen(createGitHubIamRoleInAws(logger, iamRoleCatalogConfig, iamClient))
      .andThen(createGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region }))
      .map((result) => {
        return {
          resourceId: result.repositoryName,
          name: result.repositoryName,
          params: {
            repositoryName: result.repositoryName,
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
      repositoryName: input.resourceId,
    };
    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    return await getGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(deleteInput)
      .andThen((result) => {
        if (result.isNone()) {
          const message = `Resource ${input.resourceId} Not exist`;
          return err(new HandlerError(message, "BAD_REQUEST", message));
        } else {
          return ok(result.value);
        }
      })
      .andThen(deleteGitHubIamRoleInAws(logger, iamClient))
      .andThen(deleteGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region }))
      .map(() => {});
  };

const getResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["getResource"] =>
  async (input: GetResourceInput): Promise<Result<Option<ResourceOutput>, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("getResource", input, iamRoleCatalogConfig);

    const getInput = {
      repositoryName: input.resourceId,
    };

    return await getGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(getInput).map(
      (result) => {
        if (result.isNone()) {
          return none;
        } else {
          return some({
            resourceId: result.value.repositoryName,
            name: result.value.repositoryName,
            params: {
              repositoryName: result.value.repositoryName,
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

    return await listGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(listInput).map(
      (result) => {
        return {
          resources: result.items.map((item) => {
            return {
              resourceId: item.repositoryName,
              name: item.repositoryName,
              params: {
                repositoryName: item.repositoryName,
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
      repositoryName: input.resourceId,
    };
    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    return getGitHubIamRoleDBItem(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(getInput)
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
      .andThen(listGitHubIamRoleAuditItemInAws(logger, iamClient))
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
