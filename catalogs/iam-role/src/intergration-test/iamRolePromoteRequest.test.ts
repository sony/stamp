import { ApprovedInput, ApprovedOutput, ListResourceAuditItemInput, RevokedInput, RevokedOutput } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IamRoleCatalogConfig } from "../config";
import { createAwsAccountDBItem, deleteAwsAccountDBItem } from "../events/database/awsAccountDB";
import { createAwsAccountResourceHandler } from "../handlers/awsAccountResource";
import { createGitHubIamRoleResourceHandler } from "../handlers/gitHubIamRoleResource";
import { createIamRolePromoteRequestHandler } from "../handlers/iamRolePromoteRequest";
import { createTargetIamRoleResourceHandler } from "../handlers/targetIamRoleResource";
import { createLogger } from "@stamp-lib/stamp-logger";

const tableNameForAWSAccount = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-AWSAccountResource`;
const tableNameForGitHubIamRole = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-GitHubIamRoleResource`;
const tableNameForTargetIamRole = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-TargetRoleResource`;
const tableNameForJumpIamRole = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-JumpIamRoleResource`;

const iamRoleFactoryAccountId = process.env.IAM_ROLE_FACTORY_AWS_ACCOUNT_ID!;
const githubOrgName = process.env.GITHUB_ORG_NAME!;
const config: IamRoleCatalogConfig = {
  region: "us-west-2",
  iamRoleFactoryAccountId: iamRoleFactoryAccountId,
  iamRoleFactoryAccountRoleArn: `arn:aws:iam::${iamRoleFactoryAccountId}:role/stamp-execute-role`,
  gitHubOrgName: githubOrgName,
  policyNamePrefix: "test",
  roleNamePrefix: "test",
  awsAccountResourceTableName: tableNameForAWSAccount,
  targetIamRoleResourceTableName: tableNameForTargetIamRole,
  gitHubIamRoleResourceTableName: tableNameForGitHubIamRole,
  jumpIamRoleResourceTableName: tableNameForJumpIamRole,
  logLevel: "DEBUG",
};
const iamRolePromoteRequestHandler = createIamRolePromoteRequestHandler(config);
const gitHubIamRoleResourceHandler = createGitHubIamRoleResourceHandler(config);
const targetIamRoleResourceHandler = createTargetIamRoleResourceHandler(config);
const awsAccountResourceHandler = createAwsAccountResourceHandler(config);

const approvedInput: ApprovedInput = {
  inputParams: {
    param: {
      id: "userName",
      value: "test-user",
    },
  },
  inputResources: {
    "github-iam-role": {
      resourceId: "stamp-testRepository-promote",
      resourceTypeId: "test-resource-type",
    },
    "aws-account": {
      resourceId: "222233334444",
      resourceTypeId: "test-resource-type",
    },
    "target-iam-role": {
      resourceId: "222233334444#stamp-test-iam-role-promote",
      resourceTypeId: "test-resource-type",
    },
  },
  requestId: "526f66ea-17fe-14f3-e0cc-d02cdceb7abc",
  approvalFlowId: "PROMOTE_PERMISSION",
  requestUserId: "27e29081-eeb5-4cd1-95a9-6352a9269e1a",
  approverId: "2ac53bbf-d560-4c69-8ebb-9c252a0eaa8e",
  requestDate: "2023-11-01T08:00:00.000Z",
  approvedDate: "2023-11-01T09:00:00.000Z",
};
const revokedInput: RevokedInput = {
  ...approvedInput,
  revokedDate: "2023-11-01T10:00:00.000Z",
};

describe("Testing iamRolePromoteRequest", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeAll(async () => {
    await deleteAwsAccountDBItem(
      logger,
      tableNameForAWSAccount,
      config
    )({
      accountId: "222233334444",
    });
    await gitHubIamRoleResourceHandler.deleteResource({
      resourceTypeId: "test-resource-type",
      resourceId: "stamp-testRepository-promote",
    });
    await targetIamRoleResourceHandler.deleteResource({
      resourceTypeId: "test-resource-type",
      resourceId: "222233334444#stamp-test-iam-role-promote",
    });
    await createAwsAccountDBItem(
      logger,
      tableNameForAWSAccount,
      config
    )({
      accountId: "222233334444",
      name: "stamp-unit-test-promote",
    });
    await gitHubIamRoleResourceHandler.createResource({
      resourceTypeId: "test-resource-type",
      inputParams: {
        repositoryName: "stamp-testRepository-promote",
      },
    });
    await targetIamRoleResourceHandler.createResource({
      resourceTypeId: "test-resource-type",
      inputParams: {
        iamRoleName: "stamp-test-iam-role-promote",
      },
      parentResourceId: "222233334444",
    });
  });

  afterAll(async () => {
    await deleteAwsAccountDBItem(
      logger,
      tableNameForAWSAccount,
      config
    )({
      accountId: "222233334444",
    });
    await gitHubIamRoleResourceHandler.deleteResource({
      resourceTypeId: "test-resource-type",
      resourceId: "stamp-testRepository-promote",
    });
    await targetIamRoleResourceHandler.deleteResource({
      resourceTypeId: "test-resource-type",
      resourceId: "222233334444#stamp-test-iam-role-promote",
    });
  });

  describe("approvedHandler", () => {
    it("returns successful result", async () => {
      const input = approvedInput;
      const expected: ApprovedOutput = {
        message: expect.any(String),
        isSuccess: true,
      };
      const resultAsync = iamRolePromoteRequestHandler.approved(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });
  });

  describe("TargetIamRoleResource Audit", () => {
    it("returns successful result", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: "test-resource-type",
        resourceId: "222233334444#stamp-test-iam-role-promote",
      };
      const expected = [
        {
          type: "permission",
          name: "Permission granted GitHub Repositories",
          values: ["stamp-testRepository-promote"],
        },
      ];
      const resultAsync = targetIamRoleResourceHandler.listResourceAuditItem(input);
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
  });

  describe(
    "AwsAccountResource Audit",
    () => {
      it("returns successful result", async () => {
        const input: ListResourceAuditItemInput = {
          resourceTypeId: "test-resource-type",
          resourceId: "222233334444",
        };
        const expected = [
          {
            type: "permission",
            name: "stamp-test-iam-role-promote" + " " + "IAM Role",
            values: ["stamp-testRepository-promote GitHub IAM Role"],
          },
        ];
        const resultAsync = awsAccountResourceHandler.listResourceAuditItem(input);
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

      it("tests multiple items and pagination for awsAccountResourceHandler.listResourceAuditItem()", async () => {
        const approvedInput2: ApprovedInput = {
          inputParams: {
            param: {
              id: "userName",
              value: "test-user",
            },
          },
          inputResources: {
            "github-iam-role": {
              resourceId: "stamp-testRepository-promote2",
              resourceTypeId: "test-resource-type",
            },
            "aws-account": {
              resourceId: "222233334444",
              resourceTypeId: "test-resource-type",
            },
            "target-iam-role": {
              resourceId: "222233334444#stamp-test-iam-role-promote2",
              resourceTypeId: "test-resource-type",
            },
          },
          requestId: "526f66ea-17fe-14f3-e0cc-d02cdceb7abc",
          approvalFlowId: "PROMOTE_PERMISSION",
          requestUserId: "27e29081-eeb5-4cd1-95a9-6352a9269e1a",
          approverId: "2ac53bbf-d560-4c69-8ebb-9c252a0eaa8e",
          requestDate: "2023-11-01T08:00:00.000Z",
          approvedDate: "2023-11-01T09:00:00.000Z",
        };
        const revokedInput2: RevokedInput = {
          ...approvedInput2,
          revokedDate: "2023-11-01T10:00:00.000Z",
        };

        await gitHubIamRoleResourceHandler.createResource({
          resourceTypeId: "test-resource-type",
          inputParams: {
            repositoryName: "stamp-testRepository-promote2",
          },
        });
        await targetIamRoleResourceHandler.createResource({
          resourceTypeId: "test-resource-type",
          inputParams: {
            iamRoleName: "stamp-test-iam-role-promote2",
          },
          parentResourceId: "222233334444",
        });
        const resultAsync1 = iamRolePromoteRequestHandler.approved(approvedInput2);
        const result1 = await resultAsync1;
        if (result1.isErr()) {
          throw result1.error;
        }

        const input: ListResourceAuditItemInput = {
          resourceTypeId: "test-resource-type",
          resourceId: "222233334444",
        };
        const expected = [
          {
            type: "permission",
            name: "stamp-test-iam-role-promote" + " " + "IAM Role",
            values: ["stamp-testRepository-promote GitHub IAM Role"],
          },
          {
            type: "permission",
            name: "stamp-test-iam-role-promote2" + " " + "IAM Role",
            values: ["stamp-testRepository-promote2 GitHub IAM Role"],
          },
        ];
        const resultAsync2 = awsAccountResourceHandler.listResourceAuditItem(input);
        const result2 = await resultAsync2;
        if (result2.isErr()) {
          throw result2.error;
        }
        expect(Array.isArray(result2.value.auditItems)).toBe(true);
        expect(result2.value.auditItems).toEqual(expected);
        result2.value.auditItems.forEach((value) => {
          expect(Array.isArray(value.values)).toBe(true);
        });
        expect(result2.value.auditItems.length).toBe(2);
        expect(result2.value.paginationToken).toBe(undefined);

        const resultAsync3 = awsAccountResourceHandler.listResourceAuditItem({
          resourceTypeId: "test-resource-type",
          resourceId: "222233334444",
          limit: 1,
          paginationToken: undefined,
        });
        const result3 = await resultAsync3;
        if (result3.isErr()) {
          throw result3.error;
        }
        expect(result3.value.auditItems.length).toBe(1);
        expect(result3.value.paginationToken).not.toBe(undefined);

        const resultAsync4 = awsAccountResourceHandler.listResourceAuditItem({
          resourceTypeId: "test-resource-type",
          resourceId: "222233334444",
          limit: 1,
          paginationToken: result3.value.paginationToken,
        });
        const result4 = await resultAsync4;
        if (result4.isErr()) {
          throw result4.error;
        }
        expect(result4.value.auditItems.length).toBe(1);
        expect(result4.value.paginationToken).not.toBe(undefined);

        // "A Query operation can return an empty result set and a LastEvaluatedKey if all the items read for the page of results are filtered out."
        // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Class/QueryCommand/
        const resultAsync5 = awsAccountResourceHandler.listResourceAuditItem({
          resourceTypeId: "test-resource-type",
          resourceId: "222233334444",
          limit: 1,
          paginationToken: result4.value.paginationToken,
        });
        const result5 = await resultAsync5;
        if (result5.isErr()) {
          throw result5.error;
        }
        expect(result5.value.auditItems.length).toBe(0);
        expect(result5.value.paginationToken).toBe(undefined);

        const resultAsync6 = iamRolePromoteRequestHandler.revoked(revokedInput2);
        const result6 = await resultAsync6;
        if (result6.isErr()) {
          throw result6.error;
        }

        await targetIamRoleResourceHandler.deleteResource({
          resourceTypeId: "test-resource-type",
          resourceId: "222233334444#stamp-test-iam-role-promote2",
        });
        await gitHubIamRoleResourceHandler.deleteResource({
          resourceTypeId: "test-resource-type",
          resourceId: "stamp-testRepository-promote2",
        });
      });
    },
    { timeout: 100000 }
  );

  describe("GitHubIamRoleResource Audit", () => {
    it("returns successful result", async () => {
      const input: ListResourceAuditItemInput = {
        resourceTypeId: "test-resource-type",
        resourceId: "stamp-testRepository-promote",
      };
      const expected = [
        {
          type: "permission",
          name: "IAM Role that allows AssumeRole",
          values: ["arn:aws:iam::222233334444:role/stamp-test-iam-role-promote"],
        },
      ];
      const resultAsync = gitHubIamRoleResourceHandler.listResourceAuditItem(input);
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
  });

  describe("revokedHandler", () => {
    it("returns successful result", async () => {
      const input = revokedInput;
      const expected: RevokedOutput = {
        message: expect.any(String),
        isSuccess: true,
      };
      const resultAsync = iamRolePromoteRequestHandler.revoked(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });
  });
});
