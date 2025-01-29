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
import { createTargetIamRoleResourceHandler } from "./targetIamRoleResource";

const resourceTypeId = "iam-role-aws-account";
const parentResourceId = "112233445566";
const iamRoleName = "stamp-test-iam-role";
const id = `${parentResourceId}#${iamRoleName}`;

const iamRoleFactoryAccountId = process.env.IAM_ROLE_FACTORY_AWS_ACCOUNT_ID!;
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
const targetIamRoleResource = createTargetIamRoleResourceHandler(config);

describe("Testing targetIamRoleResource", () => {
  beforeAll(async () => {
    const input: DeleteResourceInput = {
      resourceTypeId: resourceTypeId,
      resourceId: id,
    };
    await targetIamRoleResource.deleteResource(input);
  });

  afterAll(async () => {
    const input: DeleteResourceInput = {
      resourceTypeId: resourceTypeId,
      resourceId: id,
    };
    await targetIamRoleResource.deleteResource(input);
  });

  describe("createResourceHandler", () => {
    it("returns successful result", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          iamRoleName: iamRoleName,
        },
        parentResourceId: parentResourceId,
      };
      const expected: ResourceOutput = {
        params: {
          iamRoleName: iamRoleName,
        },
        name: iamRoleName,
        resourceId: id,
        parentResourceId: parentResourceId,
      };
      const resultAsync = targetIamRoleResource.createResource(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if iam role name is empty", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          iamRoleName: "",
        },
        parentResourceId: parentResourceId,
      };
      const resultAsync = targetIamRoleResource.createResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role name is invalid", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          iamRoleName: 100,
        },
        parentResourceId: parentResourceId,
      };
      const resultAsync = targetIamRoleResource.createResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if parent resource ID is empty", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          iamRoleName: iamRoleName,
        },
        parentResourceId: "",
      };
      const resultAsync = targetIamRoleResource.createResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getResourceHandler", () => {
    it("returns successful result", async () => {
      const input: GetResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: id,
      };
      const expected: ResourceOutput = {
        resourceId: id,
        name: iamRoleName,
        params: {
          iamRoleName: iamRoleName,
        },
        parentResourceId: parentResourceId,
      };
      const resultAsync = targetIamRoleResource.getResource(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if resource ID does not exist", async () => {
      const input: GetResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "non#exist",
      };
      const resultAsync = targetIamRoleResource.getResource(input);
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
      const resultAsync = targetIamRoleResource.getResource(input);
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
          value: id,
        },
        paginationToken: undefined,
      };
      const resultAsync = targetIamRoleResource.listResources(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(Array.isArray(result.value.resources)).toBe(true);
    });

    it("returns successful result if account ID is string", async () => {
      const input: ListResourcesInput = {
        resourceTypeId: resourceTypeId,
        parentResourceId: parentResourceId,
        prefix: {
          type: "name",
          value: id,
        },
        paginationToken: undefined,
      };
      const resultAsync = targetIamRoleResource.listResources(input);
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
        resourceId: id,
      };
      const expected = [
        {
          type: "permission",
          name: "Permission granted GitHub Repositories",
          values: expect.anything(),
        },
      ];
      const resultAsync = targetIamRoleResource.listResourceAuditItem(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(Array.isArray(result.value.auditItems)).toBe(true);
      expect(result.value.auditItems).toEqual(expected);
      result.value.auditItems.forEach((value) => {
        expect(Array.isArray(value.values)).toBe(true);
      });
    });

    it("returns failure result if resource ID does not exist", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "non#exist",
      };
      const resultAsync = targetIamRoleResource.listResourceAuditItem(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failure result if resource ID is empty", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "",
      };
      const resultAsync = targetIamRoleResource.listResourceAuditItem(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteResourceHandler", () => {
    it("returns successful result", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: id,
      };
      const resultAsync = targetIamRoleResource.deleteResource(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if resource ID does not exist", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "non#exist",
      };
      const resultAsync = targetIamRoleResource.deleteResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if resource ID is empty", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "",
      };
      const resultAsync = targetIamRoleResource.deleteResource(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
