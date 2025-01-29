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
import { createJumpIamRoleResourceHandler } from "./jumpIamRoleResource";

const resourceTypeId = "jump-iam-role-test";

const iamRoleFactoryAccountId = process.env.IAM_ROLE_FACTORY_AWS_ACCOUNT_ID!;
const originIamRoleArn = process.env.ORIGIN_IAM_ROLE_ARN!;
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
const jumpIamRoleResource = createJumpIamRoleResourceHandler(config);

describe("Testing jumpIamRoleResource", () => {
  beforeAll(async () => {
    const input: DeleteResourceInput = {
      resourceTypeId: resourceTypeId,
      resourceId: "jumpTestServiceRole",
    };
    await jumpIamRoleResource.deleteResource(input);
  });

  afterAll(async () => {
    const input: DeleteResourceInput = {
      resourceTypeId: resourceTypeId,
      resourceId: "jumpTestServiceRole",
    };
    await jumpIamRoleResource.deleteResource(input);
  });

  describe("createResourceHandler", () => {
    it("returns successful result", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          jumpIamRoleName: "jumpTestServiceRole",
          originIamRoleArn: originIamRoleArn,
        },
      };
      const expected: ResourceOutput = {
        params: {
          jumpIamRoleName: "jumpTestServiceRole",
          originIamRoleArn: originIamRoleArn,
          iamRoleArn: expect.any(String),
        },
        name: "jumpTestServiceRole",
        resourceId: "jumpTestServiceRole",
      };
      const result = await jumpIamRoleResource.createResource(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);

      // error because already created
      const result2 = await jumpIamRoleResource.createResource(input);
      if (result2.isErr()) {
        expect(result2.error.userMessage).toContain("already in use");
      }
    });

    it("returns failed result if Jump iam role name is empty", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          jumpIamRoleName: "",
          originIamRoleArn: originIamRoleArn,
        },
      };
      const result = await jumpIamRoleResource.createResource(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if origin iam role name is empty", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          jumpIamRoleName: "jumpTestServiceRole",
          originIamRoleArn: "",
        },
      };
      const result = await jumpIamRoleResource.createResource(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if Jump iam role name is invalid", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          jumpIamRoleName: 100,
          originIamRoleArn: originIamRoleArn,
        },
      };
      const result = await jumpIamRoleResource.createResource(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if origin iam role name is invalid", async () => {
      const input: CreateResourceInput = {
        resourceTypeId: resourceTypeId,
        inputParams: {
          jumpIamRoleName: "jumpTestServiceRole",
          originIamRoleArn: 100,
        },
      };
      const result = await jumpIamRoleResource.createResource(input);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getResourceHandler", () => {
    it("returns successful result", async () => {
      const input: GetResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "jumpTestServiceRole",
      };
      const expected: ResourceOutput = {
        params: {
          jumpIamRoleName: "jumpTestServiceRole",
          originIamRoleArn: originIamRoleArn,
          iamRoleArn: expect.any(String),
        },
        name: "jumpTestServiceRole",
        resourceId: "jumpTestServiceRole",
      };
      const result = await jumpIamRoleResource.getResource(input);
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
      const result = await jumpIamRoleResource.getResource(input);
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
      const result = await jumpIamRoleResource.getResource(input);
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
          value: "jumpTestServiceRole",
        },
        paginationToken: undefined,
      };
      const result = await jumpIamRoleResource.listResources(input);
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
        resourceId: "jumpTestServiceRole",
      };
      const result = await jumpIamRoleResource.listResourceAuditItem(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(Array.isArray(result.value.auditItems)).toBe(true);
    });

    it("returns failure result if resource ID does not exist", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "jumpTestServiceRole-NotExist",
      };
      const result = await jumpIamRoleResource.listResourceAuditItem(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns failure result if resource ID is empty", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "",
      };
      const result = await jumpIamRoleResource.listResourceAuditItem(input);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteResourceHandler", () => {
    it("returns successful result", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "jumpTestServiceRole",
      };
      const result = await jumpIamRoleResource.deleteResource(input);
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if resource ID does not exist", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "111122223333",
      };
      const result = await jumpIamRoleResource.deleteResource(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if resource ID is empty", async () => {
      const input: DeleteResourceInput = {
        resourceTypeId: resourceTypeId,
        resourceId: "",
      };
      const result = await jumpIamRoleResource.deleteResource(input);
      expect(result.isErr()).toBe(true);
    });
  });
});
