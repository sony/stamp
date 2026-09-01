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
const repositoryResourceId = `${githubOrgName}/${repositoryName}`;
// Fixed fixtures: IAM never validates sub-claim contents against GitHub, so
// any numeric strings work for integration tests.
const gitHubOrgId = "1234567";
const repositoryId = "9876543";
const expectedSubject = `repo:${githubOrgName}@${gitHubOrgId}/${repositoryName}@${repositoryId}:*`;
const roleSuffix = "it-suffix";
const suffixedResourceId = `${githubOrgName}/${repositoryName}/${roleSuffix}`;
const envRoleSuffix = "it-env";
const envScopedResourceId = `${githubOrgName}/${repositoryName}/${envRoleSuffix}`;

const config: IamRoleCatalogConfig = {
  region: "us-west-2",
  iamRoleFactoryAccountId: iamRoleFactoryAccountId,
  iamRoleFactoryAccountRoleArn: `arn:aws:iam::${iamRoleFactoryAccountId}:role/stamp-execute-role`,
  gitHubOrgs: [{ name: githubOrgName, id: gitHubOrgId }],
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
    for (const resourceId of [repositoryResourceId, suffixedResourceId, envScopedResourceId]) {
      await gitHubIamRoleResource.deleteResource({ resourceTypeId, resourceId });
    }
  });

  afterAll(async () => {
    for (const resourceId of [repositoryResourceId, suffixedResourceId, envScopedResourceId]) {
      await gitHubIamRoleResource.deleteResource({ resourceTypeId, resourceId });
    }
  });

  describe("createResourceHandler", () => {
    it("returns successful result", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          repositoryName: repositoryName,
          gitHubOrgName: githubOrgName,
          repositoryId: repositoryId,
        },
      };
      const expected: ResourceOutput = {
        params: {
          repositoryName: repositoryName,
          gitHubOrgName: githubOrgName,
          repositoryId: repositoryId,
          subjectType: "repository",
          subject: expectedSubject,
          iamRoleArn: expect.any(String),
        },
        name: repositoryResourceId,
        resourceId: repositoryResourceId,
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

    it("creates a second role for the same repository when a roleSuffix is given", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          repositoryName: repositoryName,
          gitHubOrgName: githubOrgName,
          repositoryId: repositoryId,
          roleSuffix: roleSuffix,
        },
      };
      const expected: ResourceOutput = {
        params: {
          repositoryName: repositoryName,
          gitHubOrgName: githubOrgName,
          repositoryId: repositoryId,
          roleSuffix: roleSuffix,
          subjectType: "repository",
          subject: expectedSubject,
          iamRoleArn: expect.any(String),
        },
        name: suffixedResourceId,
        resourceId: suffixedResourceId,
      };
      const result = await gitHubIamRoleResource.createResource(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
      expect(result.value.params.iamRoleArn).toContain(`-${roleSuffix}`);

      // Both roles for the repository can be fetched independently.
      const suffixed = await gitHubIamRoleResource.getResource({ resourceTypeId, resourceId: suffixedResourceId });
      if (suffixed.isErr()) {
        throw suffixed.error;
      }
      expect(suffixed.value.isSome()).toBe(true);
      const unsuffixed = await gitHubIamRoleResource.getResource({ resourceTypeId, resourceId: repositoryResourceId });
      if (unsuffixed.isErr()) {
        throw unsuffixed.error;
      }
      expect(unsuffixed.value.isSome()).toBe(true);

      // Deleting the suffixed role leaves the base role intact.
      const deleted = await gitHubIamRoleResource.deleteResource({ resourceTypeId, resourceId: suffixedResourceId });
      expect(deleted.isOk()).toBe(true);
      const stillThere = await gitHubIamRoleResource.getResource({ resourceTypeId, resourceId: repositoryResourceId });
      if (stillThere.isErr()) {
        throw stillThere.error;
      }
      expect(stillThere.value.isSome()).toBe(true);
    });

    it("creates an environment-scoped role", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          repositoryName: repositoryName,
          gitHubOrgName: githubOrgName,
          repositoryId: repositoryId,
          roleSuffix: envRoleSuffix,
          subjectType: "environment",
          subjectValue: "production",
        },
      };
      const expected: ResourceOutput = {
        params: {
          repositoryName: repositoryName,
          gitHubOrgName: githubOrgName,
          repositoryId: repositoryId,
          roleSuffix: envRoleSuffix,
          subjectType: "environment",
          subjectValue: "production",
          subject: `repo:${githubOrgName}@${gitHubOrgId}/${repositoryName}@${repositoryId}:environment:production`,
          iamRoleArn: expect.any(String),
        },
        name: envScopedResourceId,
        resourceId: envScopedResourceId,
      };
      const result = await gitHubIamRoleResource.createResource(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);

      const deleted = await gitHubIamRoleResource.deleteResource({ resourceTypeId, resourceId: envScopedResourceId });
      expect(deleted.isOk()).toBe(true);
    });

    it("returns failed result if repository name is empty", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          repositoryName: "",
          gitHubOrgName: githubOrgName,
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
          gitHubOrgName: githubOrgName,
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
        resourceId: repositoryResourceId,
      };
      const expected: ResourceOutput = {
        params: {
          repositoryName: repositoryName,
          gitHubOrgName: githubOrgName,
          repositoryId: repositoryId,
          subjectType: "repository",
          subject: expectedSubject,
          iamRoleArn: expect.any(String),
        },
        name: repositoryResourceId,
        resourceId: repositoryResourceId,
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
        resourceId: repositoryResourceId,
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
        resourceId: repositoryResourceId,
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
