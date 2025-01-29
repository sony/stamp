import { IAMClient } from "@aws-sdk/client-iam";
import { createLogger, Logger } from "@stamp-lib/stamp-logger";
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
import { Result, ResultAsync, err, errAsync, okAsync } from "neverthrow";
import { IamRoleCatalogConfig } from "../config";
import { createAwsAccountDBItem, deleteAwsAccountDBItem, getAwsAccountDBItem, listAwsAccountDBItem } from "../events/database/awsAccountDB";
import { GetByIamRoleName, getByIamRoleName } from "../events/database/gitHubIamRoleDB";
import { GetByJumpIamRoleName, getByJumpIamRoleName } from "../events/database/jumpIamRoleDB";
import { ListTargetIamRoleDBItemByAccountIdOutput, listTargetIamRoleDBItemByAccountId } from "../events/database/targetIamRoleDB";
import {
  ListIamRoleAttachedAssumeRolePolicy,
  ListIamRoleAttachedAssumeRolePolicyOutput,
  listIamRoleAttachedAssumeRolePolicy,
} from "../events/iam-ops/assumeRolePolicy";
import { convertRepositoryRolesToAuditItems } from "../events/resource/convertRepositoryRolesToAuditItems";
import { AwsAccount } from "../types/awsAccount";
import { TargetIamRole } from "../types/targetIamRole";
import { assumeRoleCredentialProvider } from "../utils/assumeRoleCredentialProvider";
import { fetchAttachedPolicies } from "./targetIamRoleResource";

export function createAwsAccountResourceHandler(iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers {
  const iamRoleResourceHandler: ResourceHandlers = {
    createResource: createResourceHandler(iamRoleCatalogConfig),
    deleteResource: deleteResourceHandler(iamRoleCatalogConfig),
    getResource: getResourceHandler(iamRoleCatalogConfig),
    updateResource: async () => {
      return err(new HandlerError("Not implemented", "INTERNAL_SERVER_ERROR", "Not implemented"));
    },
    listResources: listResourcesHandler(iamRoleCatalogConfig),
    listResourceAuditItem: listResourceAuditItemHandler(iamRoleCatalogConfig),
  };

  return iamRoleResourceHandler;
}

const createResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["createResource"] =>
  async (input: CreateResourceInput): Promise<Result<ResourceOutput, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("createResource", input, iamRoleCatalogConfig);

    if (typeof input.inputParams.accountId !== "string") {
      return err(new HandlerError("Invalid input parameters(accountId)", "BAD_REQUEST", "Invalid input parameters(accountId)"));
    }

    if (typeof input.inputParams.name !== "string") {
      return err(new HandlerError("Invalid input parameters(name)", "BAD_REQUEST", "Invalid input parameters(name)"));
    }
    const createInput = {
      accountId: input.inputParams.accountId,
      name: input.inputParams.name,
    };
    const parsedCreateInput = AwsAccount.safeParse(createInput);
    if (!parsedCreateInput.success) {
      const message = `Failed to parse input: ${parsedCreateInput.error}`;
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }

    return await createAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })(
      parsedCreateInput.data
    ).map((result) => {
      return {
        resourceId: result.accountId,
        name: result.name,
        params: {
          accountId: result.accountId,
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

    if (typeof input.resourceId !== "string") {
      return err(new HandlerError("Invalid input parameters(accountId)", "BAD_REQUEST", "Invalid input parameters(accountId)"));
    }

    const deleteInput = {
      accountId: input.resourceId,
    };

    return await deleteAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })(deleteInput);
  };

const getResourceHandler =
  (iamRoleCatalogConfig: IamRoleCatalogConfig): ResourceHandlers["getResource"] =>
  async (input: GetResourceInput): Promise<Result<Option<ResourceOutput>, HandlerError>> => {
    const parsedConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfig);
    const logger = createLogger(parsedConfig.logLevel, { moduleName: "iam-role" });
    logger.info("getResource", input, iamRoleCatalogConfig);

    if (typeof input.resourceId !== "string") {
      return err(new HandlerError("Invalid input parameters(accountId)", "BAD_REQUEST", "Invalid input parameters(accountId)"));
    }

    const getInput = {
      accountId: input.resourceId,
    };

    return await getAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })(getInput).map(
      (result) => {
        if (result.isNone()) {
          return none;
        } else {
          return some({
            resourceId: result.value.accountId,
            name: result.value.name,
            params: {
              accountId: result.value.accountId,
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
      exclusiveStartKey: input.paginationToken ? JSON.parse(atob(input.paginationToken)) : undefined,
    };

    return await listAwsAccountDBItem(logger, iamRoleCatalogConfig.awsAccountResourceTableName, { region: iamRoleCatalogConfig.region })(listInput).map(
      (result) => {
        return {
          resources: result.items.map((item) => {
            return {
              resourceId: item.accountId,
              name: item.name,
              params: {
                accountId: item.accountId,
              },
            };
          }),
          paginationToken: result.nextToken ? btoa(JSON.stringify(result.nextToken)) : undefined,
        };
      }
    );
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

    return fetchTargetIamRoleDBItems(logger, iamRoleCatalogConfig, input.resourceId, input.paginationToken, input.limit).andThen((iamRoleDBItems) => {
      return fetchPolicies(listIamRoleAttachedAssumeRolePolicy(logger, iamClient), iamRoleDBItems.items).andThen((policies) => {
        return listRepositories(
          getByIamRoleName(logger, iamRoleCatalogConfig.gitHubIamRoleResourceTableName, {
            region: iamRoleCatalogConfig.region,
          }),
          getByJumpIamRoleName(logger, iamRoleCatalogConfig.jumpIamRoleResourceTableName, {
            region: iamRoleCatalogConfig.region,
          }),
          policies
        )
          .andThen((repositories) => convertRepositoryRolesToAuditItems(repositories))
          .andThen((auditItems) => {
            return okAsync({
              auditItems: auditItems.auditItems,
              paginationToken: iamRoleDBItems.nextToken,
            });
          });
      });
    });
  };

const fetchTargetIamRoleDBItems = (
  logger: Logger,
  iamRoleCatalogConfig: IamRoleCatalogConfig,
  accountId: string,
  nextToken?: string,
  limit?: number
): ResultAsync<ListTargetIamRoleDBItemByAccountIdOutput, HandlerError> => {
  const listInput = {
    accountId: accountId,
    nextToken: nextToken,
    limit: limit,
  };
  return listTargetIamRoleDBItemByAccountId(logger, iamRoleCatalogConfig.targetIamRoleResourceTableName, { region: iamRoleCatalogConfig.region })(
    listInput
  ).andThen((result) => {
    if ((limit === undefined || result.items.length < limit) && result.nextToken) {
      return fetchTargetIamRoleDBItems(logger, iamRoleCatalogConfig, accountId, result.nextToken, limit).map((nextResult) => ({
        items: result.items.concat(nextResult.items),
        nextToken: nextResult.nextToken,
      }));
    }
    return okAsync(result);
  });
};

type PolicyResult = { iamRoleName: string; policies: ListIamRoleAttachedAssumeRolePolicyOutput };
const fetchPolicies = (listIamRoleAttachedAssumeRolePolicyFunc: ListIamRoleAttachedAssumeRolePolicy, items: TargetIamRole[]) => {
  const fetchPoliciesPromises = items.map((item) =>
    fetchAttachedPolicies(listIamRoleAttachedAssumeRolePolicyFunc, item.assumeRolePolicyArn).map(
      (policies): PolicyResult => ({ iamRoleName: item.iamRoleName, policies })
    )
  );
  return ResultAsync.combine(fetchPoliciesPromises);
};

type ListRepositoriesInput = PolicyResult;
type RepositoryResult = { roleName: string; value: string; isJumpIamRole: boolean };
const listRepositories = (
  getByIamRoleNameFunc: GetByIamRoleName,
  getByJumpIamRoleNameFunc: GetByJumpIamRoleName,
  items: ListRepositoriesInput[]
): ResultAsync<RepositoryResult[], HandlerError> => {
  const listRepositories = items.flatMap((input) => {
    return input.policies.roleNames.map((roleName) => {
      // check in the order of GitHubIamRoleResource(repositoryName) -> JumpIamRoleResource(jumpIamRoleName)
      return getByIamRoleNameFunc({
        iamRoleName: roleName,
      }).andThen((result): ResultAsync<RepositoryResult, HandlerError> => {
        if (result.isNone()) {
          return getByJumpIamRoleNameFunc({
            iamRoleName: roleName,
          }).andThen((result): ResultAsync<RepositoryResult, HandlerError> => {
            if (result.isNone()) {
              // if none of them can be obtained, it is an error
              return errAsync(new HandlerError(`No item found for role: ${roleName}`, "INTERNAL_SERVER_ERROR", `No item found for role: ${roleName}`));
            }

            const item = result.value;
            return okAsync({ roleName: input.iamRoleName, value: item.jumpIamRoleName, isJumpIamRole: true });
          });
        }

        const item = result.value;
        return okAsync({ roleName: input.iamRoleName, value: item.repositoryName, isJumpIamRole: false });
      });
    });
  });
  return ResultAsync.combine(listRepositories);
};
