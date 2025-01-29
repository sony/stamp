import { createLogger } from "@stamp-lib/stamp-logger";
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

function createApprovedValidationInput(suffix: number): ApprovalRequestValidationInput {
  return {
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
        resourceId: "333344445555",
        resourceTypeId: "test-resource-type",
      },
      "target-iam-role": {
        resourceId: `333344445555#stamp-test-iam-role-promote-${suffix}`,
        resourceTypeId: "test-resource-type",
      },
    },
    requestId: "526f66ea-17fe-14f3-e0cc-d02cdceb7abc",
    approvalFlowId: "PROMOTE_PERMISSION",
    requestUserId: "27e29081-eeb5-4cd1-95a9-6352a9269e1a",
    approverId: "2ac53bbf-d560-4c69-8ebb-9c252a0eaa8e",
    requestDate: "2023-11-01T08:00:00.000Z",
  };
}

describe(
  "Testing iamRolePromoteRequest",
  () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-role" });
    beforeAll(async () => {
      await deleteAwsAccountDBItem(
        logger,
        tableNameForAWSAccount,
        config
      )({
        accountId: "333344445555",
      });
      await gitHubIamRoleResourceHandler.deleteResource({
        resourceTypeId: "test-resource-type",
        resourceId: "stamp-testRepository-promote",
      });
      for (let suffix = 1; suffix <= 11; suffix++) {
        await targetIamRoleResourceHandler.deleteResource({
          resourceTypeId: "test-resource-type",
          resourceId: `333344445555#stamp-test-iam-role-promote-${suffix}`,
        });
      }
      await createAwsAccountDBItem(
        logger,
        tableNameForAWSAccount,
        config
      )({
        accountId: "333344445555",
        name: "stamp-unit-test-promote",
      });
      await gitHubIamRoleResourceHandler.createResource({
        resourceTypeId: "test-resource-type",
        inputParams: {
          repositoryName: "stamp-testRepository-promote",
        },
      });
      for (let suffix = 1; suffix <= 11; suffix++) {
        const result = await targetIamRoleResourceHandler.createResource({
          resourceTypeId: "test-resource-type",
          inputParams: {
            iamRoleName: `stamp-test-iam-role-promote-${suffix}`,
          },
          parentResourceId: "333344445555",
        });
        if (result.isErr()) {
          throw result.error;
        }
      }
      for (let suffix = 1; suffix <= 9; suffix++) {
        const validationInput = createApprovedValidationInput(suffix);
        const approvedInput: ApprovedInput = {
          ...validationInput,
          approvedDate: "2023-11-01T10:00:00.000Z",
        };
        const expected: ApprovedOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result = await iamRolePromoteRequestHandler.approved(approvedInput);
        if (result.isErr()) {
          throw result.error;
        }
        expect(result.value).toEqual(expected);
      }
    }, 300000); // Set timeout to 300 seconds

    afterAll(async () => {
      for (let suffix = 1; suffix <= 9; suffix++) {
        const validationInput = createApprovedValidationInput(suffix);
        const revokedInput: RevokedInput = {
          ...validationInput,
          approvedDate: "2023-11-01T09:00:00.000Z",
          revokedDate: "2023-11-01T10:00:00.000Z",
        };
        const expected: RevokedOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result = await iamRolePromoteRequestHandler.revoked(revokedInput);
        if (result.isErr()) {
          throw result.error;
        }
        expect(result.value).toEqual(expected);
      }
      for (let suffix = 1; suffix <= 11; suffix++) {
        await targetIamRoleResourceHandler.deleteResource({
          resourceTypeId: "test-resource-type",
          resourceId: `stamp-test-iam-role-promote-${suffix}`,
        });
      }
      await deleteAwsAccountDBItem(
        logger,
        tableNameForAWSAccount,
        config
      )({
        accountId: "333344445555",
      });
      await gitHubIamRoleResourceHandler.deleteResource({
        resourceTypeId: "test-resource-type",
        resourceId: "stamp-testRepository-promote",
      });
    }, 300000); // Set timeout to 300 seconds

    describe("Scenario test", () => {
      it("Attachment of managed policy succeed -> Success will result in maximum number of attachments", async () => {
        const validationInput = createApprovedValidationInput(10);
        const expectedValidation: ApprovalRequestValidationOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result = await iamRolePromoteRequestHandler.approvalRequestValidation(validationInput);
        if (result.isErr()) {
          throw result.error;
        }
        expect(result.value).toEqual(expectedValidation);

        const approvedInput: ApprovedInput = {
          ...validationInput,
          approvedDate: "2023-11-01T10:00:00.000Z",
        };
        const expectedApprovalResult: ApprovedOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result2 = await iamRolePromoteRequestHandler.approved(approvedInput);
        if (result2.isErr()) {
          throw result2.error;
        }
        expect(result2.value).toEqual(expectedApprovalResult);
      });

      it("If you specify an attached IAM policy, it will succeed because the maximum number that can be attached will not be exceeded", async () => {
        const validationInput = createApprovedValidationInput(5);
        const expectedValidation: ApprovalRequestValidationOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result = await iamRolePromoteRequestHandler.approvalRequestValidation(validationInput);
        if (result.isErr()) {
          throw result.error;
        }
        expect(result.value).toEqual(expectedValidation);

        const approvedInput: ApprovedInput = {
          ...validationInput,
          approvedDate: "2023-11-01T10:00:00.000Z",
        };
        const expectedApprovalResult: ApprovedOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result2 = await iamRolePromoteRequestHandler.approved(approvedInput);
        if (result2.isErr()) {
          throw result2.error;
        }
        expect(result2.value).toEqual(expectedApprovalResult);
      });

      it("Attachment of management policy fails due to maximum number of attachments", async () => {
        const validationInput = createApprovedValidationInput(11);
        const expected: ApprovalRequestValidationOutput = {
          message: expect.any(String),
          isSuccess: false,
        };
        const result = await iamRolePromoteRequestHandler.approvalRequestValidation(validationInput);
        if (result.isErr()) {
          throw result.error;
        }
        expect(result.value).toEqual(expected);

        const approvedInput: ApprovedInput = {
          ...validationInput,
          approvedDate: "2023-11-01T10:00:00.000Z",
        };
        const approvedOutput: ApprovedOutput = {
          message: expect.any(String),
          isSuccess: false,
        };
        const result2 = await iamRolePromoteRequestHandler.approved(approvedInput);
        if (result2.isErr()) {
          throw result2.error;
        }
        expect(result2.value).toEqual(approvedOutput);
      });

      it("Revoke the first applied managed policy", async () => {
        const validationInput = createApprovedValidationInput(10);
        const revokedInput: RevokedInput = {
          ...validationInput,
          approvedDate: "2023-11-01T09:00:00.000Z",
          revokedDate: "2023-11-01T10:00:00.000Z",
        };
        const expected: RevokedOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result = await iamRolePromoteRequestHandler.revoked(revokedInput);
        if (result.isErr()) {
          throw result.error;
        }
        expect(result.value).toEqual(expected);
      });

      it("Successfully attaching the management policy that failed earlier", async () => {
        const validationInput = createApprovedValidationInput(11);
        const expectedValidation: ApprovalRequestValidationOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result = await iamRolePromoteRequestHandler.approvalRequestValidation(validationInput);
        if (result.isErr()) {
          throw result.error;
        }
        expect(result.value).toEqual(expectedValidation);

        const approvedInput: ApprovedInput = {
          ...validationInput,
          approvedDate: "2023-11-01T10:00:00.000Z",
        };
        const expectedApprovalResult: ApprovedOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result2 = await iamRolePromoteRequestHandler.approved(approvedInput);
        if (result2.isErr()) {
          throw result2.error;
        }
        expect(result2.value).toEqual(expectedApprovalResult);
      });

      it("Revoke the last applied managed policy", async () => {
        const validationInput = createApprovedValidationInput(11);
        const revokedInput: RevokedInput = {
          ...validationInput,
          approvedDate: "2023-11-01T09:00:00.000Z",
          revokedDate: "2023-11-01T10:00:00.000Z",
        };
        const expected: RevokedOutput = {
          message: expect.any(String),
          isSuccess: true,
        };
        const result = await iamRolePromoteRequestHandler.revoked(revokedInput);
        if (result.isErr()) {
          throw result.error;
        }
        expect(result.value).toEqual(expected);
      });
    });
  },
  { timeout: 600000 } // Set timeout to 600 second
);
