import { IAMClient } from "@aws-sdk/client-iam";
import { createLogger, Logger } from "@stamp-lib/stamp-logger";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IamRoleCatalogConfig } from "../../config";
import {
  CreateGitHubIamRoleCommand,
  CreateGitHubIamRoleNameCommand,
  CreatedGitHubIamRole,
  CreatedGitHubIamRoleName,
  GitHubIamRole,
  ListGitHubIamRoleAuditItem,
  ListGitHubIamRoleAuditItemCommand,
} from "../../types/gitHubIamRole";
import { createGitHubIamRoleInAws, createGitHubIamRoleName, deleteGitHubIamRoleInAws, listGitHubIamRoleAuditItemInAws } from "./gitHubIamRole";

const accountId = process.env.AWS_ACCOUNT_ID!;
const attachedPolicyArn = process.env.GITHUB_IAM_ROLE_ATTACHED_POLICY_ARN!;
const githubOrgName = process.env.GITHUB_ORG_NAME!;
const config: IamRoleCatalogConfig = {
  region: "us-west-2",
  iamRoleFactoryAccountId: accountId,
  iamRoleFactoryAccountRoleArn: "test-arn",
  gitHubOrgName: githubOrgName
  policyNamePrefix: "test",
  roleNamePrefix: "test",
  awsAccountResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-AWSAccountResource`,
  targetIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-TargetRoleResource`,
  gitHubIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-GitHubIamRoleResource`,
  jumpIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-JumpIamRoleResource`,
  logLevel: "DEBUG",
};

const deleteGitHubIamRoleForTest = async (logger: Logger) => {
  const iamClient = new IAMClient({ region: "us-west-2" });
  const input: GitHubIamRole = {
    repositoryName: "test-Repository",
    iamRoleName: `${config.roleNamePrefix}-github-${config.gitHubOrgName}-test-Repository`,
    iamRoleArn: "test-arn",
    createdAt: "2024-01-02T03:04:05.006Z",
  };
  await deleteGitHubIamRoleInAws(logger, iamClient)(input);
};

describe("Testing gitHubIamRole", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeAll(async () => {
    await deleteGitHubIamRoleForTest(logger);
  });

  afterAll(async () => {
    await deleteGitHubIamRoleForTest(logger);
  });

  describe("createGitHubIamRoleName", () => {
    it("creates GitHub iam role name if iam role name is 64 character or under", async () => {
      const input: CreateGitHubIamRoleNameCommand = {
        repositoryName: "1".repeat(44), // number of characters within range excluding prefix etc
      };
      const expected: CreatedGitHubIamRoleName = {
        repositoryName: "1".repeat(44), // number of characters within range excluding prefix etc
        iamRoleName: `${config.roleNamePrefix}-github-${config.gitHubOrgName}-` + "1".repeat(44),
      };
      const result = createGitHubIamRoleName(config)(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if iam role name is over 64 character", async () => {
      const input: CreateGitHubIamRoleNameCommand = {
        repositoryName: "1".repeat(44) + "a", // number of characters exceeding range limit
      };
      const result = createGitHubIamRoleName(config)(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns successful result even if repository name is empty", async () => {
      const input: CreateGitHubIamRoleNameCommand = {
        repositoryName: "",
      };
      const result = createGitHubIamRoleName(config)(input);
      expect(result.isOk()).toBe(true);
    });
  });

  describe("createGitHubIamRoleInAws", () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-role" });
    it("creates GitHub iam role in AWS", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: CreateGitHubIamRoleCommand = {
        repositoryName: "test-Repository",
        iamRoleName: `${config.roleNamePrefix}-github-${config.gitHubOrgName}-test-Repository`,
      };
      const expected: CreatedGitHubIamRole = {
        repositoryName: "test-Repository",
        iamRoleName: `${config.roleNamePrefix}-github-${config.gitHubOrgName}-test-Repository`,
        iamRoleArn: expect.any(String),
        createdAt: expect.any(String),
      };
      const resultAsync = createGitHubIamRoleInAws(logger, config, iamClient)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if repository name is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: CreateGitHubIamRoleCommand = {
        repositoryName: "",
        iamRoleName: `${config.roleNamePrefix}-github-${config.gitHubOrgName}-test-Repository`,
      };
      const resultAsync = createGitHubIamRoleInAws(logger, config, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role name is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: CreateGitHubIamRoleCommand = {
        repositoryName: "test-Repository",
        iamRoleName: "",
      };
      const resultAsync = createGitHubIamRoleInAws(logger, config, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listGitHubIamRoleAuditItemInAws", () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-role" });

    it("lists GitHub iam role audit item in AWS", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: ListGitHubIamRoleAuditItemCommand = {
        attachedPolicyArns: [attachedPolicyArn],
      };
      const expected: ListGitHubIamRoleAuditItem = {
        items: [expect.any(String)],
      };
      const resultAsync = listGitHubIamRoleAuditItemInAws(logger, iamClient)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns successful result even if attachedPolicyArns are empty", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: ListGitHubIamRoleAuditItemCommand = {
        attachedPolicyArns: [],
      };
      const resultAsync = listGitHubIamRoleAuditItemInAws(logger, iamClient)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.items.length).toBe(0);
    });
  });

  describe("deleteGitHubIamRoleInAws", () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-role" });
    it("deletes GitHub iam role in AWS", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: GitHubIamRole = {
        repositoryName: "test-Repository",
        iamRoleName: `${config.roleNamePrefix}-github-${config.gitHubOrgName}-test-Repository`,
        iamRoleArn: "test-arn",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const expected = structuredClone(input);
      const resultAsync = deleteGitHubIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if repository name is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: GitHubIamRole = {
        repositoryName: "",
        iamRoleName: `${config.roleNamePrefix}-github-${config.gitHubOrgName}-test-Repository`,
        iamRoleArn: "test-arn",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = deleteGitHubIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role name is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: GitHubIamRole = {
        repositoryName: "test-Repository",
        iamRoleName: "",
        iamRoleArn: "test-arn",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = deleteGitHubIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role arn is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: GitHubIamRole = {
        repositoryName: "test-Repository",
        iamRoleName: `${config.roleNamePrefix}-github-${config.gitHubOrgName}-test-Repository`,
        iamRoleArn: "",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = deleteGitHubIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if created date is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: GitHubIamRole = {
        repositoryName: "test-Repository",
        iamRoleName: `${config.roleNamePrefix}-github-${config.gitHubOrgName}-test-Repository`,
        iamRoleArn: "test-arn",
        createdAt: "",
      };
      const resultAsync = deleteGitHubIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
