import { none, some } from "@stamp-lib/stamp-option";
import {
  CreateResourceInput,
  DeleteResourceInput,
  GetResourceInput,
  ListResourceAuditItemInput,
  ListResourcesInput,
  ResourceOutput,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IamRoleCatalogConfig } from "../config";
import { createGitHubIamRoleResourceHandler } from "./gitHubIamRoleResource";

const iamRoleFactoryAccountId = process.env.IAM_ROLE_FACTORY_AWS_ACCOUNT_ID!;
const resourceTypeId = "iam-role-aws-account";
const repositoryName = "test-repository";
const githubOrgName = process.env.GITHUB_ORG_NAME!;

const config: IamRoleCatalogConfig = {
  region: "us-west-2",
  iamRoleFactoryAccountId: iamRoleFactoryAccountId,
  iamRoleFactoryAccountRoleArn: `arn:aws:iam::${iamRoleFactoryAccountId}:role/stamp-execute-role`,
  gitHubOrgName: githubOrgName,
  policyNamePrefix: "test",
  roleNamePrefix: "test",
  gitHubIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-GitHubIamRoleResource`,
  targetIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-TargetRoleResource`,
  awsAccountResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-AWSAccountResource`,
  jumpIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-JumpIamRoleResource`,
  logLevel: "DEBUG",
};
const gitHubIamRoleResource = createGitHubIamRoleResourceHandler(config);

describe("Testing gitHubIamRoleResource", () => {
  beforeAll(async () => {
    const input: DeleteResourceInput = {
      resourceTypeId: resourceTypeId,
      resourceId: repositoryName,
    };
    await gitHubIamRoleResource.deleteResource(input);
  });

  afterAll(async () => {
    const input: DeleteResourceInput = {
      resourceTypeId: resourceTypeId,
      resourceId: repositoryName,
    };
    await gitHubIamRoleResource.deleteResource(input);
  });

  describe("createResourceHandler", () => {
    it("returns successful result", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          repositoryName: repositoryName,
        },
      };
      const expected: ResourceOutput = {
        params: {
          repositoryName: repositoryName,
          iamRoleArn: expect.any(String),
        },
        name: repositoryName,
        resourceId: repositoryName,
      };
      const result = await gitHubIamRoleResource.createResource(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);

      // error because already created
      const result2 = await gitHubIamRoleResource.createResource(input);
      if (result2.isErr()) {
        expect(result2.error.userMessage).toContain("already exists");
      }
    });

    it("returns failed result if repository name is empty", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          repositoryName: "",
        },
      };
      const result = await gitHubIamRoleResource.createResource(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if repository name is invalid", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          repositoryName: 100,
        },
      };
      const resultAsync = gitHubIamRoleResource.createResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getResourceHandler", () => {
    it("returns successful result", async () => {
      const input: GetResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: repositoryName,
      };
      const expected: ResourceOutput = {
        params: {
          repositoryName: repositoryName,
          iamRoleArn: expect.any(String),
        },
        name: repositoryName,
        resourceId: repositoryName,
      };
      const result = await gitHubIamRoleResource.getResource(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if resource ID does not exist", async () => {
      const input: GetResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "111122223333",
      };
      const result = await gitHubIamRoleResource.getResource(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failed result if resource ID is empty", async () => {
      const input: GetResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "",
      };
      const result = await gitHubIamRoleResource.getResource(input);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listResourcesHandler", () => {
    it("returns successful result", async () => {
      const input: ListResourcesInput = {
        resourceTypeId: resourceTypeId,
        parentResourceId: undefined,
        prefix: {
          type: "name",
          value: repositoryName,
        },
        paginationToken: undefined,
      };
      const result = await gitHubIamRoleResource.listResources(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(Array.isArray(result.value.resources)).toBe(true);
    });
  });

  describe("listResourceAuditItemHandler", () => {
    it("returns successful result", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: resourceTypeId,
        resourceId: repositoryName,
      };
      const result = await gitHubIamRoleResource.listResourceAuditItem(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(Array.isArray(result.value.auditItems)).toBe(true);
    });

    it("returns failure result if resource ID does not exist", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "non-existent-repository",
      };
      const result = await gitHubIamRoleResource.listResourceAuditItem(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns failure result if resource ID is empty", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "",
      };
      const result = await gitHubIamRoleResource.listResourceAuditItem(input);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteResourceHandler", () => {
    it("returns successful result", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: repositoryName,
      };
      const result = await gitHubIamRoleResource.deleteResource(input);
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if resource ID does not exist", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "111122223333",
      };
      const result = await gitHubIamRoleResource.deleteResource(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if resource ID is empty", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "",
      };
      const result = await gitHubIamRoleResource.deleteResource(input);
      expect(result.isErr()).toBe(true);
    });
  });
});
