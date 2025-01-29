import { none, some } from "@stamp-lib/stamp-option";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GitHubIamRole } from "../../types/gitHubIamRole";
import {
  DeleteGitHubIamRoleDBItemInput,
  GetByIamRoleNameInput,
  GetGitHubIamRoleDBItemInput,
  GitHubRepositoryName,
  ListGitHubIamRoleDBItemInput,
  createGitHubIamRoleDBItem,
  deleteGitHubIamRoleDBItem,
  getByIamRoleName,
  getGitHubIamRoleDBItem,
  listGitHubIamRoleDBItem,
} from "./gitHubIamRoleDB";
import { createLogger } from "@stamp-lib/stamp-logger";

const tableName = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-GitHubIamRoleResource`;
const config = { region: "us-west-2" };
const githubOrgName = process.env.GITHUB_ORG_NAME!;

describe("Testing gitHubIamRoleDB", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeAll(async () => {
    const input: DeleteGitHubIamRoleDBItemInput = {
      repositoryName: "stamp-testRepository",
    };
    await deleteGitHubIamRoleDBItem(logger, tableName, config)(input);
  });

  afterAll(async () => {
    const input: DeleteGitHubIamRoleDBItemInput = {
      repositoryName: "stamp-testRepository",
    };
    await deleteGitHubIamRoleDBItem(logger, tableName, config)(input);
  });

  describe("createGitHubIamRoleDBItem", () => {
    it("returns failed result if repository name is invalid", async () => {
      const input: GitHubIamRole = {
        repositoryName: "",
        iamRoleName: `test-github-${githubOrgName}-test-repository`,
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = createGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result even if iam role name is empty", async () => {
      const input: GitHubIamRole = {
        repositoryName: "stamp-testRepository",
        iamRoleName: "",
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = createGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns successful result even if iam role arn is empty", async () => {
      const input: GitHubIamRole = {
        repositoryName: "stamp-testRepository",
        iamRoleName: `test-github-${githubOrgName}-test-repository`,
        iamRoleArn: "",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = createGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if creation date is invalid", async () => {
      const input: GitHubIamRole = {
        repositoryName: "stamp-testRepository",
        iamRoleName: `test-github-${githubOrgName}-test-repository`,
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        createdAt: "",
      };
      const resultAsync = createGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("creates GitHub iam role DB item", async () => {
      const input: GitHubIamRole = {
        repositoryName: "stamp-testRepository",
        iamRoleName: `test-github-${githubOrgName}-test-repository`,
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const expected = structuredClone(input);
      const resultAsync = createGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const gitHubIamRole = result.value;
      expect(gitHubIamRole).toEqual(expected);
    });
  });

  describe("getGitHubIamRoleDBItem", () => {
    it("gets GitHub iam role DB item", async () => {
      const input: GetGitHubIamRoleDBItemInput = {
        repositoryName: "stamp-testRepository",
      };
      const expected: GitHubIamRole = {
        repositoryName: "stamp-testRepository",
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        iamRoleName: `test-github-${githubOrgName}-test-repository`,
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = getGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const gitHubIamRole = result.value;
      expect(gitHubIamRole).toEqual(some(expected));
    });

    it("returns none if repository name does not exist", async () => {
      const input: GetGitHubIamRoleDBItemInput = {
        repositoryName: "test-non-exist-repository",
      };
      const resultAsync = getGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failed result if repository name is invalid", async () => {
      const input: GetGitHubIamRoleDBItemInput = {
        repositoryName: "",
      };
      const resultAsync = getGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getByIamRoleName", () => {
    it("gets GitHub iam role DB item using GSI", async () => {
      const input: GetByIamRoleNameInput = {
        iamRoleName: `test-github-${githubOrgName}-test-repository`,
      };
      const expected: GitHubRepositoryName = {
        repositoryName: "stamp-testRepository",
      };

      const resultAsync = getByIamRoleName(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const gitHubRepositoryName = result.value;
      expect(gitHubRepositoryName).toEqual(some(expected));
    });

    it("returns none if iam role name does not exist", async () => {
      const input: GetByIamRoleNameInput = {
        iamRoleName: "test-non-exist-iam-role",
      };
      const resultAsync = getByIamRoleName(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failed result if iam role name is invalid", async () => {
      const input: GetByIamRoleNameInput = {
        iamRoleName: "",
      };
      const resultAsync = getByIamRoleName(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listGitHubIamRoleDBItem", () => {
    it("lists GitHub iam role DB item", async () => {
      const input: ListGitHubIamRoleDBItemInput = {};
      const resultAsync = listGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const gitHubIamRoles = result.value;
      expect(gitHubIamRoles.items.length).not.toBe(0);
    });
  });

  describe("deleteGitHubIamRoleDBItem", () => {
    it("deletes GitHub iam role DB item", async () => {
      const input: DeleteGitHubIamRoleDBItemInput = {
        repositoryName: "stamp-testRepository",
      };
      const resultAsync = deleteGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if repository name does not exist", async () => {
      const input: DeleteGitHubIamRoleDBItemInput = {
        repositoryName: "test-non-exist-repository",
      };
      const resultAsync = deleteGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if repository name is invalid", async () => {
      const input: DeleteGitHubIamRoleDBItemInput = {
        repositoryName: "",
      };
      const resultAsync = deleteGitHubIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
