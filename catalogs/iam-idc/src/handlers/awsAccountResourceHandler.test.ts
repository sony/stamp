import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { createAwsAccountResourceHandler } from "./awsAccountResourceHandler";
import { some } from "@stamp-lib/stamp-option";

import { approved, ApprovedInput } from "../workflows/approvalFlow/approved";
import { revoked, RevokedInput } from "../workflows/approvalFlow/revoked";
import { createPermission, CreatePermissionInput } from "../workflows/permission/createPermission";
import { deletePermission, DeletePermissionInput } from "../workflows/permission/deletePermission";
import { createLogger } from "@stamp-lib/stamp-logger";

const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
const config = {
  region: "us-west-2",
  identityInstanceArn: process.env.IDENTITY_INSTANCE_ARN!,
  identityStoreId: process.env.IDENTITY_STORE_ID!,
  permissionTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`,
  accountManagementTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`,
  permissionIdPrefix: "ST",
};
const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;
async function createAndApprovePermission(input: CreatePermissionInput, userName: string) {
  const resultAsync = createPermission(logger, config)(input);
  const result = await resultAsync;
  if (result.isErr()) {
    throw result.error;
  }
  const permissionInfo = result.value;
  const permissionId = permissionInfo.permissionId;
  console.log("permissionId:", permissionId);

  const approvedInput: ApprovedInput = {
    permissionId: permissionId,
    userName: userName,
  };

  const resultAsync2 = approved(logger, config)(approvedInput);
  const result2 = await resultAsync2;
  if (result2.isSuccess === false) {
    throw result2.message;
  }

  return permissionId;
}

async function revokeAndDeletePermission(permissionId: string, userName: string) {
  const input: RevokedInput = {
    permissionId: permissionId,
    userName: userName,
  };

  const resultAsync = revoked(logger, config)(input);
  const result = await resultAsync;
  expect(result.isSuccess).toBe(true);

  const input2: DeletePermissionInput = {
    permissionId: permissionId,
  };
  const resultAsync2 = deletePermission(logger, config)(input2);
  const result2 = await resultAsync2;
  if (result2.isErr()) {
    throw result2.error;
  }
}

describe(
  "Testing the awsAccountResourceHandler",
  () => {
    const awsAccountResourceHandler = createAwsAccountResourceHandler({
      region: "us-west-2",
      identityInstanceArn: process.env.IDENTITY_INSTANCE_ARN!,
      identityStoreId: process.env.IDENTITY_STORE_ID!,
      accountId: process.env.IAM_IDC_AWS_ACCOUNT_ID!,
      accountManagementTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`,
      permissionTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`,
      logLevel: "DEBUG",
      permissionIdPrefix: "ST",
    });

    let permissionId1: string | null = null;
    let permissionId2: string | null = null;
    const userName: string = process.env.EXISTING_USER_NAME!;
    beforeAll(async () => {
      const input1: CreatePermissionInput = {
        name: "approval workflow unit test1",
        description: "Unit-test-1",
        awsAccountId: targetAwsAccountId,
        permissionSetNameId: "Unit-test1",
        managedIamPolicyNames: ["ReadOnlyAccess"],
        customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
        sessionDuration: "PT12H",
      };
      permissionId1 = await createAndApprovePermission(input1, userName);

      const input2: CreatePermissionInput = {
        name: "approval workflow unit test2",
        description: "Unit-test2",
        awsAccountId: targetAwsAccountId,
        permissionSetNameId: "Unit-test2",
        managedIamPolicyNames: ["ReadOnlyAccess"],
        customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
        sessionDuration: "PT12H",
      };
      permissionId2 = await createAndApprovePermission(input2, userName);
    });

    afterAll(async () => {
      if (permissionId1) {
        await revokeAndDeletePermission(permissionId1, userName);

        permissionId1 = null;
      }
      if (permissionId2) {
        await revokeAndDeletePermission(permissionId2, userName);
        permissionId2 = null;
      }
    });

    it("Testing the successful case of createResource in awsAccountResourceHandler", async () => {
      const resourceTypeId: string = "iam-idc-aws-account";
      const awsAccountId: string = targetAwsAccountId;
      const resultAsync = awsAccountResourceHandler.createResource({
        resourceTypeId: resourceTypeId,
        inputParams: {
          name: "test account name",
          accountId: awsAccountId,
        },
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const resourceOutput = result.value;
      expect(resourceOutput).toEqual({
        name: "test account name",
        resourceId: awsAccountId,
        params: {
          accountId: awsAccountId,
        },
      });
    });

    it("Testing the successful case of getResource in awsAccountResourceHandler", async () => {
      const resourceTypeId: string = "iam-idc-aws-account";
      const awsAccountId: string = targetAwsAccountId;
      const resultAsync = awsAccountResourceHandler.getResource({
        resourceTypeId: resourceTypeId,
        resourceId: awsAccountId,
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const value = result.value;
      if (value === undefined) {
        throw new Error("Unexpected undefined value");
      }
      expect(value).toEqual(
        some({
          name: "test account name",
          resourceId: awsAccountId,
          params: {
            accountId: awsAccountId,
          },
          parentResourceId: undefined,
        })
      );
    });

    it("Testing the case when getResource in awsAccountResourceHandler does not exist", async () => {
      const resourceTypeId: string = "iam-idc-aws-account";
      const resultAsync = awsAccountResourceHandler.getResource({
        resourceTypeId: resourceTypeId,
        resourceId: "111111111111",
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.isNone()).toBe(true);
    });

    it("Testing the successful case of updateResource in awsAccountResourceHandler", async () => {
      const resourceTypeId: string = "iam-idc-aws-account";
      const awsAccountId: string = targetAwsAccountId;
      const resultAsync = awsAccountResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: awsAccountId,
        updateParams: {
          name: "update test account name",
          accountId: awsAccountId,
        },
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const value = result.value;
      if (value === undefined) {
        throw new Error("Unexpected undefined value");
      }
      expect(value).toEqual({
        name: "update test account name",
        resourceId: awsAccountId,
        params: {
          accountId: awsAccountId,
        },
        parentResourceId: undefined,
      });
    });

    it("Testing the successful case of listResources in awsAccountResourceHandler", async () => {
      const resourceTypeId: string = "iam-idc-aws-account";
      const awsAccountId: string = targetAwsAccountId;
      const resultAsync = awsAccountResourceHandler.listResources({
        resourceTypeId: resourceTypeId,
        parentResourceId: undefined,
        prefix: {
          type: "name",
          value: awsAccountId,
        },
        paginationToken: undefined,
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const listResourcesOutput = result.value;
      expect(Array.isArray(listResourcesOutput.resources)).toBe(true);
    });

    it("Testing the successful case of listResourceAuditItem in awsAccountResourceHandler", async () => {
      const resourceTypeId: string = "iam-idc-aws-account";
      const awsAccountId: string = targetAwsAccountId;
      const resultAsync = awsAccountResourceHandler.listResourceAuditItem({
        resourceTypeId: resourceTypeId,
        resourceId: awsAccountId,
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const listResourceAuditItemOutput = result.value;
      expect(Array.isArray(listResourceAuditItemOutput.auditItems)).toBe(true);
    });

    it("Testing successful pagination in listResourceAuditItem of awsAccountResourceHandler", async () => {
      const resourceTypeId: string = "iam-idc-aws-account";
      // Assumption: The target AWS Accoun contains 2 items
      const awsAccountId: string = targetAwsAccountId;
      const resultAsync = awsAccountResourceHandler.listResourceAuditItem({
        resourceTypeId: resourceTypeId,
        resourceId: awsAccountId,
        paginationToken: undefined,
        limit: 1,
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const listResourceAuditItemOutput1 = result.value;
      expect(Array.isArray(listResourceAuditItemOutput1.auditItems)).toBe(true);
      expect(listResourceAuditItemOutput1.auditItems.length).toBe(1);
      expect(listResourceAuditItemOutput1.paginationToken).not.toBe(undefined);

      const resultAsync2 = awsAccountResourceHandler.listResourceAuditItem({
        resourceTypeId: resourceTypeId,
        resourceId: awsAccountId,
        paginationToken: listResourceAuditItemOutput1.paginationToken,
        limit: 1,
      });
      const result2 = await resultAsync2;
      if (result2.isErr()) {
        throw result2.error;
      }

      const listResourceAuditItemOutput2 = result2.value;
      expect(Array.isArray(listResourceAuditItemOutput2.auditItems)).toBe(true);
      expect(listResourceAuditItemOutput2.auditItems.length).toBe(1);
      expect(listResourceAuditItemOutput2.paginationToken).not.toBe(undefined);

      const resultAsync3 = awsAccountResourceHandler.listResourceAuditItem({
        resourceTypeId: resourceTypeId,
        resourceId: awsAccountId,
        paginationToken: listResourceAuditItemOutput2.paginationToken,
        limit: 1,
      });
      const result3 = await resultAsync3;
      if (result3.isErr()) {
        throw result3.error;
      }

      const listResourceAuditItemOutput3 = result3.value;
      expect(Array.isArray(listResourceAuditItemOutput3.auditItems)).toBe(true);
      // "A Query operation can return an empty result set and a LastEvaluatedKey if all the items read for the page of results are filtered out."
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Class/QueryCommand/
      expect(listResourceAuditItemOutput3.auditItems.length).toBe(0);
      expect(listResourceAuditItemOutput3.paginationToken).toBe(undefined);
    });

    it("Testing the successful case of deleteResource in awsAccountResourceHandler", async () => {
      const resourceTypeId: string = "iam-idc-aws-account";
      const awsAccountId: string = targetAwsAccountId;
      const resultAsync = awsAccountResourceHandler.deleteResource({
        resourceTypeId: resourceTypeId,
        resourceId: awsAccountId,
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(void 0);
    });
  },
  { timeout: 100000 }
);
