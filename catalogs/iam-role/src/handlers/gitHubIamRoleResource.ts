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
import { IamRoleCatalogConfig, findAllowedGitHubOrg } from "../config";
import {
  buildGitHubIamRolePkValue,
  getGitHubIamRoleDBItem,
  listGitHubIamRoleDBItem,
  createGitHubIamRoleDBItem,
  deleteGitHubIamRoleDBItem,
} from "../events/database/gitHubIamRoleDB";
import { createGitHubIamRoleInAws, createGitHubIamRoleName, deleteGitHubIamRoleInAws, listGitHubIamRoleAuditItemInAws } from "../events/resource/gitHubIamRole";
import { listIamRoleAttachedPolicyArns, fetchAllAttachedRolePolicyArns } from "../events/iam-ops/iamRoleManagement";
import { assumeRoleCredentialProvider } from "../utils/assumeRoleCredentialProvider";
import { GitHubIamRole, GitHubOrgNameField, GitHubRepositoryIdField, GitHubRepositoryNameField, RoleSuffixField, SubjectTypeField } from "../types/gitHubIamRole";

/**
 * Resolves the user-facing repository name and GitHub organization for a
 * persisted GitHub IAM Role record. For records created before multi-org
 * support the new attributes are absent; the bare PK *is* the repository
 * name so that fallback is exact, but the org cannot be safely inferred
 * (a wrong attribution could mislead operators), so it is returned as
 * `undefined` and downstream callers must handle the missing value
 * explicitly.
 */
export const resolveDisplayFields = (item: GitHubIamRole): { repositoryName: string; gitHubOrgName: string | undefined; isLegacy: boolean } => {
  const isLegacy = !item.gitHubOrgName;
  return {
    repositoryName: item.gitHubRepositoryName ?? item.repositoryName,
    gitHubOrgName: item.gitHubOrgName,
    isLegacy,
  };
};

export const buildResourceOutput = (item: GitHubIamRole): ResourceOutput => {
  const display = resolveDisplayFields(item);
  // For multi-org records, the user-visible name encodes the org so identically
  // named repositories under different orgs remain distinguishable in selector
  // UIs that key off `resource.name`. The role suffix is appended for the same
  // reason: multiple roles of one repository must stay distinguishable. Legacy
  // single-org records keep the bare repository name to avoid changing how
  // existing resources are displayed.
  const displayName =
    display.isLegacy || !display.gitHubOrgName
      ? display.repositoryName
      : `${display.gitHubOrgName}/${display.repositoryName}${item.roleSuffix ? `/${item.roleSuffix}` : ""}`;
  const params: Record<string, string> = {
    repositoryName: display.repositoryName,
    iamRoleArn: item.iamRoleArn,
  };
  if (display.gitHubOrgName) {
    params.gitHubOrgName = display.gitHubOrgName;
  }
  // Immutable-claims era attributes; absent on records created before that
  // support landed, in which case they are simply omitted from the output.
  if (item.gitHubRepositoryId) {
    params.repositoryId = item.gitHubRepositoryId;
  }
  if (item.roleSuffix) {
    params.roleSuffix = item.roleSuffix;
  }
  if (item.subjectType) {
    params.subjectType = item.subjectType;
  }
  if (item.subject) {
    params.subject = item.subject;
  }
  return {
    resourceId: item.repositoryName,
    name: displayName,
    params,
  };
};

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
    if (typeof input.inputParams.gitHubOrgName !== "string" || input.inputParams.gitHubOrgName.trim() === "") {
      return err(new HandlerError("Invalid input parameters(gitHubOrgName)", "BAD_REQUEST", "Invalid input parameters(gitHubOrgName)"));
    }
    // Trim once and use the trimmed values everywhere below — validating the
    // trimmed value but looking up the raw one would reject padded input for
    // orgs that are actually allowed. Charset validation matters because both
    // names are embedded in the compound PK and the OIDC subject claim, where
    // `/`, `@`, `:` and whitespace act as delimiters.
    const repositoryName = input.inputParams.repositoryName.trim();
    const gitHubOrgName = input.inputParams.gitHubOrgName.trim();
    if (!GitHubRepositoryNameField.safeParse(repositoryName).success) {
      const message =
        "Invalid input parameters(repositoryName): must be a bare repository name (alphanumeric characters, hyphens, underscores, and periods only)";
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }
    if (!GitHubOrgNameField.safeParse(gitHubOrgName).success) {
      const message = "Invalid input parameters(gitHubOrgName): must be a GitHub organization name (alphanumeric characters and hyphens only)";
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }
    if (!findAllowedGitHubOrg(parsedConfig, gitHubOrgName)) {
      const message = `GitHub organization "${gitHubOrgName}" is not allowed. Allowed organizations: ${parsedConfig.gitHubOrgs
        .map((org) => org.name)
        .join(", ")}.`;
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }
    if (typeof input.inputParams.repositoryId !== "string" || !GitHubRepositoryIdField.safeParse(input.inputParams.repositoryId.trim()).success) {
      const message =
        "Invalid input parameters(repositoryId): must be the numeric GitHub repository ID (see `GET https://api.github.com/repos/{owner}/{repo}`)";
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }
    // Optional: distinguishes multiple IAM roles for the same repository.
    // Treat an empty/whitespace value the same as omitted.
    const rawRoleSuffix = input.inputParams.roleSuffix;
    if (rawRoleSuffix !== undefined && typeof rawRoleSuffix !== "string") {
      return err(new HandlerError("Invalid input parameters(roleSuffix)", "BAD_REQUEST", "Invalid input parameters(roleSuffix)"));
    }
    const roleSuffix = typeof rawRoleSuffix === "string" && rawRoleSuffix.trim() !== "" ? rawRoleSuffix.trim() : undefined;
    if (roleSuffix !== undefined && !RoleSuffixField.safeParse(roleSuffix).success) {
      const message =
        "Invalid input parameters(roleSuffix): must be 1-32 alphanumeric/hyphen characters, starting and ending with an alphanumeric character";
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }
    // Optional: defaults to "repository" (whole-repo scope). Other subject
    // types (branch / environment / tag / pull_request) are planned but not
    // yet supported.
    const rawSubjectType = input.inputParams.subjectType;
    if (rawSubjectType !== undefined && typeof rawSubjectType !== "string") {
      return err(new HandlerError("Invalid input parameters(subjectType)", "BAD_REQUEST", "Invalid input parameters(subjectType)"));
    }
    const subjectTypeParseResult = SubjectTypeField.safeParse(
      typeof rawSubjectType === "string" && rawSubjectType.trim() !== "" ? rawSubjectType.trim() : undefined
    );
    if (!subjectTypeParseResult.success) {
      const message = `Invalid input parameters(subjectType): "${rawSubjectType}" is not yet supported. Supported values: repository (default).`;
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }
    const subjectType = subjectTypeParseResult.data;

    const repositoryId = input.inputParams.repositoryId.trim();
    const pkValue = buildGitHubIamRolePkValue(gitHubOrgName, repositoryName, roleSuffix);

    // If it has already been created, an error indicating "already created" will be returned.
    const result = await getGitHubIamRoleDBItem(logger, parsedConfig.gitHubIamRoleResourceTableName, { region: parsedConfig.region })({
      repositoryName: pkValue,
    });
    if (result.isErr()) {
      return err(new HandlerError(`${result.error}`, "INTERNAL_SERVER_ERROR"));
    }
    if (result.isOk() && result.value.isSome()) {
      const message = `The GitHub IAM role for ${pkValue} already exists.`;
      return err(new HandlerError(message, "BAD_REQUEST", message));
    }

    // Also guard against a legacy single-org record stored under the bare
    // repository name as PK. Such a record would otherwise be invisible to the
    // compound-PK lookup above and we would proceed to call IAM CreateRole
    // with a name that already exists. Always look up the bare-PK item (not
    // just when the requested org happens to be first in the allowlist) and
    // reject only when its stored `iamRoleName` matches what we are about to
    // create — this makes the check independent of allowlist ordering and
    // avoids returning a clean `BAD_REQUEST` for an unrelated legacy record
    // that targets a different org.
    if (repositoryName !== pkValue) {
      const legacyResult = await getGitHubIamRoleDBItem(logger, parsedConfig.gitHubIamRoleResourceTableName, { region: parsedConfig.region })({
        repositoryName: repositoryName,
      });
      if (legacyResult.isErr()) {
        return err(new HandlerError(`${legacyResult.error}`, "INTERNAL_SERVER_ERROR"));
      }
      if (legacyResult.isOk() && legacyResult.value.isSome()) {
        const baseRoleName = `${parsedConfig.roleNamePrefix}-github-${gitHubOrgName}-${repositoryName}`;
        const prospectiveIamRoleName = roleSuffix ? `${baseRoleName}-${roleSuffix}` : baseRoleName;
        if (legacyResult.value.value.iamRoleName === prospectiveIamRoleName) {
          const message = `The GitHub IAM role for ${pkValue} already exists (legacy record).`;
          return err(new HandlerError(message, "BAD_REQUEST", message));
        }
      }
    }

    const createInput = {
      repositoryName,
      gitHubOrgName,
      repositoryId,
      roleSuffix,
      subjectType,
    };

    const iamClient = new IAMClient({
      region: parsedConfig.region,
      credentials: assumeRoleCredentialProvider(parsedConfig.iamRoleFactoryAccountRoleArn, parsedConfig.region),
    });

    return await createGitHubIamRoleName(parsedConfig)(createInput)
      .asyncAndThen(createGitHubIamRoleInAws(logger, parsedConfig, iamClient))
      .andThen(createGitHubIamRoleDBItem(logger, parsedConfig.gitHubIamRoleResourceTableName, { region: parsedConfig.region }))
      .map((persisted) => buildResourceOutput(persisted));
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
      region: parsedConfig.region,
      credentials: assumeRoleCredentialProvider(parsedConfig.iamRoleFactoryAccountRoleArn, parsedConfig.region),
    });

    return await getGitHubIamRoleDBItem(logger, parsedConfig.gitHubIamRoleResourceTableName, { region: parsedConfig.region })(deleteInput)
      .andThen((result) => {
        if (result.isNone()) {
          const message = `Resource ${input.resourceId} Not exist`;
          return err(new HandlerError(message, "BAD_REQUEST", message));
        } else {
          return ok(result.value);
        }
      })
      .andThen(deleteGitHubIamRoleInAws(logger, iamClient))
      .andThen(() => deleteGitHubIamRoleDBItem(logger, parsedConfig.gitHubIamRoleResourceTableName, { region: parsedConfig.region })(deleteInput))
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

    return await getGitHubIamRoleDBItem(logger, parsedConfig.gitHubIamRoleResourceTableName, { region: parsedConfig.region })(getInput).map((result) => {
      if (result.isNone()) {
        return none;
      } else {
        return some(buildResourceOutput(result.value));
      }
    });
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

    return await listGitHubIamRoleDBItem(logger, parsedConfig.gitHubIamRoleResourceTableName, { region: parsedConfig.region })(listInput).map((result) => {
      return {
        resources: result.items.map((item) => buildResourceOutput(item)),
        nextToken: result.nextToken,
      };
    });
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
      region: parsedConfig.region,
      credentials: assumeRoleCredentialProvider(parsedConfig.iamRoleFactoryAccountRoleArn, parsedConfig.region),
    });

    return getGitHubIamRoleDBItem(logger, parsedConfig.gitHubIamRoleResourceTableName, { region: parsedConfig.region })(getInput)
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
