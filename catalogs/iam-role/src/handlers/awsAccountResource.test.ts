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
import { createAwsAccountResourceHandler } from "./awsAccountResource";

const resourceTypeId = "iam-role-aws-account";
const accountId = process.env.AWS_ACCOUNT_ID!;
const iamRoleFactoryAccountId = process.env.IAM_ROLE_FACTORY_AWS_ACCOUNT_ID!;
const name = "stamp-test-name";
const githubOrgName = process.env.GITHUB_ORG_NAME!;

const config: IamRoleCatalogConfig = {
  region: "us-west-2",
  iamRoleFactoryAccountId: iamRoleFactoryAccountId,
  iamRoleFactoryAccountRoleArn: `arn:aws:iam::${iamRoleFactoryAccountId}:role/stamp-execute-role`,
  gitHubOrgName: githubOrgName,
  policyNamePrefix: "test",
  roleNamePrefix: "test",
  awsAccountResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-AWSAccountResource`,
  targetIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-TargetRoleResource`,
  gitHubIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-GitHubIamRoleResource`,
  jumpIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-JumpIamRoleResource`,
  logLevel: "DEBUG",
};
const awsAccountResource = createAwsAccountResourceHandler(config);

describe("Testing awsAccountResource", () => {
  beforeAll(async () => {
    const input: DeleteResourceInput = {
      resourceTypeId: resourceTypeId,
      resourceId: accountId,
    };
    await awsAccountResource.deleteResource(input);
  });

  afterAll(async () => {
    const input: DeleteResourceInput = {
      resourceTypeId: resourceTypeId,
      resourceId: accountId,
    };
    await awsAccountResource.deleteResource(input);
  });

  describe("createResourceHandler", () => {
    it("returns successful result", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          accountId: accountId,
          name: name,
        },
      };
      const expected: ResourceOutput = {
        params: {
          accountId: accountId,
        },
        name: name,
        resourceId: accountId,
      };
      const resultAsync = awsAccountResource.createResource(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if account ID is empty", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          accountId: "",
          name: name,
        },
      };
      const resultAsync = awsAccountResource.createResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if account ID is invalid", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          accountId: 100,
          name: name,
        },
      };
      const resultAsync = awsAccountResource.createResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if name is empty", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          accountId: accountId,
          name: "",
        },
      };
      const resultAsync = awsAccountResource.createResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if name is invalid", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          accountId: accountId,
          name: 100,
        },
      };
      const resultAsync = awsAccountResource.createResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getResourceHandler", () => {
    it("returns successful result", async () => {
      const input: GetResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: accountId,
      };
      const expected: ResourceOutput = {
        params: {
          accountId: accountId,
        },
        name: name,
        resourceId: accountId,
      };
      const resultAsync = awsAccountResource.getResource(input);
      const result = await resultAsync;
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
      const resultAsync = awsAccountResource.getResource(input);
      const result = await resultAsync;
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
      const resultAsync = awsAccountResource.getResource(input);
      const result = await resultAsync;
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
          value: accountId,
        },
        paginationToken: undefined,
      };
      const resultAsync = awsAccountResource.listResources(input);
      const result = await resultAsync;
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
        resourceId: accountId,
      };
      const resultAsync = awsAccountResource.listResourceAuditItem(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(Array.isArray(result.value.auditItems)).toBe(true);
      result.value.auditItems.forEach((value) => {
        expect(Array.isArray(value.values)).toBe(true);
      });
    });

    it("returns failure result if resource ID does not exist", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "111122223333",
      };
      const resultAsync = awsAccountResource.listResourceAuditItem(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(Array.isArray(result.value.auditItems)).toBe(true);
      expect(result.value.auditItems.length).toBe(0);
    });

    it("returns failure result if resource ID is empty", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "",
      };
      const resultAsync = awsAccountResource.listResourceAuditItem(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteResourceHandler", () => {
    it("returns successful result", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: accountId,
      };
      const resultAsync = awsAccountResource.deleteResource(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if resource ID does not exist", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "111122223333",
      };
      const resultAsync = awsAccountResource.deleteResource(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if resource ID is empty", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "",
      };
      const resultAsync = awsAccountResource.deleteResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
