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
import { Result, ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import { IamRoleCatalogConfig } from "../config";
import { getByIamRoleName } from "../events/database/gitHubIamRoleDB";
import {
  createTargetIamRoleDBItem,
  deleteTargetIamRoleDBItem,
  getTargetIamRoleDBItem,
  listTargetIamRoleDBItem,
  listTargetIamRoleDBItemByAccountId,
} from "../events/database/targetIamRoleDB";
import {
  ListIamRoleAttachedAssumeRolePolicy,
  ListIamRoleAttachedAssumeRolePolicyOutput,
  createAssumeRolePolicy,
  deleteAssumeRolePolicy,
  listIamRoleAttachedAssumeRolePolicy,
} from "../events/iam-ops/assumeRolePolicy";
import { createTargetIamRole, deleteTargetIamRole } from "../events/resource/targetIamRole";
import { assumeRoleCredentialProvider } from "../utils/assumeRoleCredentialProvider";

export function createTargetIamRoleResourceHandler(iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers {
  const targetIamRoleResourceHandler: ResourceHandlers = {
    createResource: createResourceHandler(iamRoleCatalogConfig),
    deleteResource: deleteResourceHandler(iamRoleCatalogConfig),
    getResource: getResourceHandler(iamRoleCatalogConfig),
    updateResource: async () => {
      return err(new HandlerError("Not implemented", "INTERNAL_SERVER_ERROR", "Not implemented"));
    },
    listResources: listResourcesHandler(iamRoleCatalogConfig),
    listResourceAuditItem: listResourceAuditItemHandler(iamRoleCatalogConfig),
  };

  return targetIamRoleResourceHandler;
}

const createResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["createResource"] =>
  async (input: CreateResourceInput): Promise<Result<ResourceOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("createResource", input, iamRoleCatalogConfig);

    if (typeof input.parentResourceId !== "string") {
      return err(new HandlerError("Invalid input parentResourceId", "BAD_REQUEST", "Invalid input parentResourceId"));
    }
    if (typeof input.inputParams.iamRoleName !== "string") {
      return err(new HandlerError("Invalid input parameters(iamRoleName)", "BAD_REQUEST", "Invalid input parameters(iamRoleName)"));
    }

    const createInput = {
      accountId: input.parentResourceId,
      iamRoleName: input.inputParams.iamRoleName,
      prefixName: iamRoleCatalogConfig.policyNamePrefix,
    };

    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    return await createTargetIamRole(createAssumeRolePolicy(logger, iamClient))(createInput)
      .andThen(createTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region }))
      .map((result) => {
        return {
          resourceId: result.id,
          name: result.iamRoleName,
          params: {
            iamRoleName: result.iamRoleName,
          },
          parentResourceId: result.accountId,
        };
      })
      .mapErr((error) => {
        logger.error(error);
        return new HandlerError("Failed to create resource", "INTERNAL_SERVER_ERROR", "Failed to create resource");
      });
  };

const deleteResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["deleteResource"] =>
  async (input: DeleteResourceInput): Promise<Result<void, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("deleteResource", input, iamRoleCatalogConfig);

    if (typeof input.resourceId !== "string") {
      return err(new HandlerError("Invalid input resourceId", "BAD_REQUEST", "Invalid input resourceId"));
    }

    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    const getInput = {
      id: input.resourceId,
    };

    return await getTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(getInput)
      .andThen((getResult) => {
        if (getResult.isNone()) {
          return errAsync(new HandlerError("Resource not found", "NOT_FOUND", "Resource not found"));
        }
        return okAsync(getResult.value);
      })
      .andThen(deleteTargetIamRole(deleteAssumeRolePolicy(logger, iamClient)))
      .andThen(deleteTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region }));
  };

const getResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["getResource"] =>
  async (input: GetResourceInput): Promise<Result<Option<ResourceOutput>, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("getResource", input, iamRoleCatalogConfig);

    if (typeof input.resourceId !== "string") {
      return err(new HandlerError("Invalid input resourceId", "BAD_REQUEST", "Invalid input resourceId"));
    }

    const getParam = {
      id: input.resourceId,
    };

    return await getTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(getParam).map(
      (result) => {
        if (result.isNone()) {
          return none;
        }
        return some({
          resourceId: result.value.id,
          name: result.value.iamRoleName,
          params: {
            iamRoleName: result.value.iamRoleName,
          },
          parentResourceId: result.value.accountId,
        });
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
      accountId: input.parentResourceId,
    };
    const result = await (() => {
      if (typeof listInput.accountId === "string") {
        return listTargetIamRoleDBItemByAccountId(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
          namePrefix: listInput.namePrefix,
          nextToken: listInput.nextToken,
          accountId: listInput.accountId,
        });
      } else {
        return listTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(listInput);
      }
    })();

    return result.map((result) => {
      return {
        resources: result.items.map((item) => {
          return {
            resourceId: item.id,
            name: item.iamRoleName,
            params: {
              iamRoleName: item.iamRoleName,
            },
            parentResourceId: item.accountId,
          };
        }),
      };
    });
  };

const listResourceAuditItemHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["listResourceAuditItem"] =>
  async (input: ListResourceAuditItemInput): Promise<Result<ListResourceAuditItemOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("ListResourceAuditItem", input, iamRoleCatalogConfig);

    const iamClient = new IAMClient({
      region: iamRoleCatalogConfig.region,
      credentials: assumeRoleCredentialProvider(iamRoleCatalogConfig.iamRoleFactoryAccountRoleArn, iamRoleCatalogConfig.region),
    });

    return await getTargetIamRoleDBItem(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })({
      id: input.resourceId,
    })
      .andThen((result) => {
        if (result.isNone()) {
          return errAsync(new HandlerError("Resource not found", "NOT_FOUND", "Resource not found"));
        }
        return okAsync(result.value);
      })
      .andThen((result) => {
        const listIamRoleAttachedAssumeRolePolicyFunc = listIamRoleAttachedAssumeRolePolicy(logger, iamClient);
        return fetchAttachedPolicies(listIamRoleAttachedAssumeRolePolicyFunc, result.assumeRolePolicyArn);
      })
      .andThen((result) => {
        const getByIamRoleNameFunc = getByIamRoleName(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, {
          region: iamRoleCatalogConfig.region,
        });
        const listRepositories = result.roleNames.map((roleName) => {
          return getByIamRoleNameFunc({
            iamRoleName: roleName,
          }).andThen((result) => {
            if (result.isNone()) {
              return errAsync(new HandlerError(`No item found for role: ${roleName}`, "INTERNAL_SERVER_ERROR", `No item found for role: ${roleName}`));
            }

            const item = result.value;
            return okAsync(item.repositoryName);
          });
        });
        return ResultAsync.combine(listRepositories);
      })
      .andThen((items) => {
        return ok({
          auditItems: [
            {
              type: "permission" as const,
              name: "Permission granted GitHub Repositories",
              values: items,
            },
          ],
        });
      });
  };

export const fetchAttachedPolicies = (
  listIamRoleAttachedAssumeRolePolicyFunc: ListIamRoleAttachedAssumeRolePolicy,
  assumeRolePolicyArn: string,
  nextToken?: string
): ResultAsync<ListIamRoleAttachedAssumeRolePolicyOutput, HandlerError> => {
  return listIamRoleAttachedAssumeRolePolicyFunc({ assumeRolePolicyArn: assumeRolePolicyArn, nextToken: nextToken }).andThen((result) => {
    if (result.nextToken) {
      return fetchAttachedPolicies(listIamRoleAttachedAssumeRolePolicyFunc, assumeRolePolicyArn, result.nextToken).map((nextResult) => {
        return {
          roleNames: result.roleNames.concat(nextResult.roleNames),
          nextToken: nextResult.nextToken,
        };
      });
    } else {
      return ok(result);
    }
  });
};
