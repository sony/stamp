import {
  ApprovalRequestValidationInput,
  ApprovalRequestValidationOutput,
  ApprovedInput,
  ApprovedOutput,
  RevokedInput,
  RevokedOutput,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IamRoleCatalogConfig } from "../config";
import { createAwsAccountDBItem, deleteAwsAccountDBItem } from "../events/database/awsAccountDB";
import { createGitHubIamRoleResourceHandler } from "./gitHubIamRoleResource";
import { createIamRolePromoteRequestHandler } from "./iamRolePromoteRequest";
import { createTargetIamRoleResourceHandler } from "./targetIamRoleResource";
import { createLogger } from "@stamp-lib/stamp-logger";

const tableNameForAWSAccount = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-AWSAccountResource`;
const tableNameForGitHubIamRole = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-GitHubIamRoleResource`;
const tableNameForTargetIamRole = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-TargetRoleResource`;
const tableNameForJumpIamRole = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-JumpIamRoleResource`;

const accountId = "222233334444";
const repositoryName = "stamp-testRepository-promote";
const id = "222233334444#stamp-test-iam-role-promote";
const resourceTypeId = "test-resource-type";
const requestId = "526f66ea-17fe-14f3-e0cc-d02cdceb7abc";
const approvalFlowId = "PROMOTE_PERMISSION";
const requestUserId = "27e29081-eeb5-4cd1-95a9-6352a9269e1a";
const approverId = "2ac53bbf-d560-4c69-8ebb-9c252a0eaa8e";
const requestDate = "2023-11-01T08:00:00.000Z";
const approvedDate = "2023-11-01T09:00:00.000Z";
const revokedDate = "2023-11-01T10:00:00.000Z";

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

const approvedInput: ApprovedInput = {
  inputParams: {
    param: {
      id: "userName",
      value: "test-user",
    },
  },
  inputResources: {
    "github-iam-role": {
      resourceId: repositoryName,
      resourceTypeId: resourceTypeId,
    },
    "aws-account": {
      resourceId: accountId,
      resourceTypeId: resourceTypeId,
    },
    "target-iam-role": {
      resourceId: id,
      resourceTypeId: resourceTypeId,
    },
  },
  requestId: requestId,
  approvalFlowId: approvalFlowId,
  requestUserId: requestUserId,
  approverId: approverId,
  requestDate: requestDate,
  approvedDate: approvedDate,
};
const approvalRequestValidationInput: ApprovalRequestValidationInput = {
  ...approvedInput,
};
const revokedInput: RevokedInput = {
  ...approvedInput,
  revokedDate: revokedDate,
};

describe("Testing iamRolePromoteRequest", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeAll(async () => {
    await deleteAwsAccountDBItem(
      logger,
      tableNameForAWSAccount,
      config
    )({
      accountId: accountId,
    });
    await gitHubIamRoleResourceHandler.deleteResource({
      resourceTypeId: resourceTypeId,
      resourceId: repositoryName,
    });
    await targetIamRoleResourceHandler.deleteResource({
      resourceTypeId: resourceTypeId,
      resourceId: accountId,
    });
    await createAwsAccountDBItem(
      logger,
      tableNameForAWSAccount,
      config
    )({
      accountId: accountId,
      name: "stamp-unit-test-promote",
    });
    await gitHubIamRoleResourceHandler.createResource({
      resourceTypeId: resourceTypeId,
      inputParams: {
        repositoryName: repositoryName,
      },
    });
    await targetIamRoleResourceHandler.createResource({
      resourceTypeId: resourceTypeId,
      inputParams: {
        iamRoleName: "stamp-test-iam-role-promote",
      },
      parentResourceId: accountId,
    });
  });

  afterAll(async () => {
    await deleteAwsAccountDBItem(
      logger,
      tableNameForAWSAccount,
      config
    )({
      accountId: accountId,
    });
    await gitHubIamRoleResourceHandler.deleteResource({
      resourceTypeId: resourceTypeId,
      resourceId: repositoryName,
    });
    await targetIamRoleResourceHandler.deleteResource({
      resourceTypeId: resourceTypeId,
      resourceId: accountId,
    });
  });

  describe("approvalRequestValidationHandler", () => {
    it("returns successful result", async () => {
      const input = approvalRequestValidationInput;
      const expected: ApprovalRequestValidationOutput = {
        message: expect.any(String),
        isSuccess: true,
      };
      const resultAsync = iamRolePromoteRequestHandler.approvalRequestValidation(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each([
      [
        "the key github-iam-role does not exist",
        {
          ...approvalRequestValidationInput,
          inputResources: {
            "": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "the key aws-account does not exist",
        {
          ...approvalRequestValidationInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "the key target-iam-role does not exist",
        {
          ...approvalRequestValidationInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of github-iam-role is empty",
        {
          ...approvalRequestValidationInput,
          inputResources: {
            "github-iam-role": {
              resourceId: "",
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of aws-account is empty",
        {
          ...approvalRequestValidationInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: "",
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of target-iam-role is empty",
        {
          ...approvalRequestValidationInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: "",
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = iamRolePromoteRequestHandler.approvalRequestValidation(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it.each([
      [
        "resource ID of github-iam-role does not exist",
        {
          ...approvalRequestValidationInput,
          inputResources: {
            "github-iam-role": {
              resourceId: "non-existent-repository",
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of aws-account does not exist",
        {
          ...approvalRequestValidationInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: "000011112222",
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of target-iam-role does not exist",
        {
          ...approvalRequestValidationInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: "non#exist-target",
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
    ])("returns failure result", async (key, input) => {
      const expected: ApprovalRequestValidationOutput = {
        message: expect.any(String),
        isSuccess: false,
      };
      const resultAsync = iamRolePromoteRequestHandler.approvalRequestValidation(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
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

    it.each([
      [
        "the key github-iam-role does not exist",
        {
          ...approvedInput,
          inputResources: {
            "": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "the key aws-account does not exist",
        {
          ...approvedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "the key target-iam-role does not exist",
        {
          ...approvedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = iamRolePromoteRequestHandler.approved(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it.each([
      [
        "resource ID of github-iam-role does not exist",
        {
          ...approvedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: "non-existent-repository",
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of aws-account does not exist",
        {
          ...approvedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: "000011112222",
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of target-iam-role does not exist",
        {
          ...approvedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: "non#exist-target",
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of github-iam-role is empty",
        {
          ...approvedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: "",
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of aws-account is empty",
        {
          ...approvedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: "",
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of target-iam-role is empty",
        {
          ...approvedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: "",
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
    ])("returns failure result", async (key, input) => {
      const expected: ApprovedOutput = {
        message: expect.any(String),
        isSuccess: false,
      };
      const resultAsync = iamRolePromoteRequestHandler.approved(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
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

    it.each([
      [
        "the key github-iam-role does not exist",
        {
          ...revokedInput,
          inputResources: {
            "": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "the key aws-account does not exist",
        {
          ...revokedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "the key target-iam-role does not exist",
        {
          ...revokedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = iamRolePromoteRequestHandler.approved(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it.each([
      [
        "resource ID of github-iam-role does not exist",
        {
          ...revokedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: "non-existent-repository",
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of aws-account does not exist",
        {
          ...revokedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: "000011112222",
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of target-iam-role does not exist",
        {
          ...revokedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: "non#exist-target",
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of github-iam-role is empty",
        {
          ...revokedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: "",
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of aws-account is empty",
        {
          ...revokedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: "",
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: id,
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
      [
        "resource ID of target-iam-role is empty",
        {
          ...revokedInput,
          inputResources: {
            "github-iam-role": {
              resourceId: repositoryName,
              resourceTypeId: resourceTypeId,
            },
            "aws-account": {
              resourceId: accountId,
              resourceTypeId: resourceTypeId,
            },
            "target-iam-role": {
              resourceId: "",
              resourceTypeId: resourceTypeId,
            },
          },
        },
      ],
    ])("returns failure result", async (key, input) => {
      const expected: RevokedOutput = {
        message: expect.any(String),
        isSuccess: false,
      };
      const resultAsync = iamRolePromoteRequestHandler.approved(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });
  });
});
