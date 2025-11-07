import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { createAwsAccountResourceHandler } from "./awsAccountResourceHandler";
import { createIamIdcPermissionResourceHandler } from "./iamIdcPermissionResourceHandler";
import { createIamIdcApplicationHandler } from "./iamIdcApprovalFlowHandler";
import { IamIdcCatalogConfig } from "../config";

const identityInstanceArn: string = process.env.IDENTITY_INSTANCE_ARN!;
const identityStoreId: string = process.env.IDENTITY_STORE_ID!;
const region: string = "us-west-2";
const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;
const iamIdcAwsAccountId: string = process.env.IAM_IDC_AWS_ACCOUNT_ID!;
const parentResourceId: string = targetAwsAccountId;
const resourceTypeIdIamIdcAwsAccount: string = "iam-idc-aws-account";
const resourceTypeIdIamIdcPermission: string = "iam-idc-permission"; // Non-existent resource ID
const accountManagementTableName: string = `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`;
const permissionTableName: string = `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`;

const userName: string = process.env.EXISTING_USER_NAME!;
const nonExistUserName: string = "not exist";
const name: string = "approval handler unit test";
const description: string = "Unit-test";
const permissionSetNameId: string = "Unit-test";
const sessionDuration: string = "PT12H";
const managedIamPolicyNames: string[] = ["ReadOnlyAccess"];
const customIamPolicyNames: string[] = [`Stamp-Unit-test-${targetAwsAccountId}`]; // Custom policy created in target AWS Accoun

describe(
  "Testing the iamIdcApplicationHandler",
  () => {
    const iamIdcCatalogConfig: IamIdcCatalogConfig = {
      region: region,
      identityInstanceArn: identityInstanceArn,
      identityStoreId: identityStoreId,
      accountId: iamIdcAwsAccountId,
      accountManagementTableName: accountManagementTableName,
      permissionTableName: permissionTableName,
      logLevel: "DEBUG",
      permissionIdPrefix: "ST",
    };
    const awsAccountResourceHandler = createAwsAccountResourceHandler(iamIdcCatalogConfig);
    const iamIdcPermissionResourceHandler = createIamIdcPermissionResourceHandler(iamIdcCatalogConfig);
    const iamIdcApplicationHandler = createIamIdcApplicationHandler(iamIdcCatalogConfig);
    let resourceId: string | null = null;

    beforeAll(async () => {
      // Clean up existing permission if it exists
      const testPermissionId = `ST-${permissionSetNameId}-${targetAwsAccountId}`;
      try {
        const existingResource = await iamIdcPermissionResourceHandler.getResource({
          resourceTypeId: resourceTypeIdIamIdcPermission,
          resourceId: testPermissionId,
        });
        if (existingResource.isOk()) {
          console.log(`Cleaning up existing permission: ${testPermissionId}`);
          await iamIdcPermissionResourceHandler.deleteResource({
            resourceTypeId: resourceTypeIdIamIdcPermission,
            resourceId: testPermissionId,
          });
        }
      } catch (error) {
        console.warn(`Failed to cleanup permission ${testPermissionId}:`, error);
      }

      const resultAsync = iamIdcPermissionResourceHandler.createResource({
        resourceTypeId: resourceTypeIdIamIdcPermission,
        inputParams: {
          name: name,
          description: description,
          permissionSetNameId: permissionSetNameId,
          sessionDuration: sessionDuration,
          managedIamPolicyNames: managedIamPolicyNames,
          customIamPolicyNames: customIamPolicyNames,
        },
        parentResourceId: parentResourceId,
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const resourceOutput = result.value;
      const resultAsync2 = awsAccountResourceHandler.createResource({
        resourceTypeId: resourceTypeIdIamIdcAwsAccount,
        inputParams: {
          name: "test account name",
          accountId: parentResourceId,
        },
      });
      const result2 = await resultAsync2;
      if (result2.isErr()) {
        throw result2.error;
      }
      resourceId = resourceOutput.resourceId;
    });
    it("Testing the successful case of approvalRequestValidation in iamIdcApplicationHandler", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");
      const resultAsync = iamIdcApplicationHandler.approvalRequestValidation({
        inputParams: {
          userName: {
            id: "userName",
            value: userName,
          },
        },
        inputResources: {
          "iam-idc-aws-account": {
            resourceId: targetAwsAccountId,
            resourceTypeId: resourceTypeIdIamIdcAwsAccount,
          },
          "iam-idc-permission": {
            resourceId: resourceId,
            resourceTypeId: resourceTypeIdIamIdcPermission,
          },
        },
        requestId: "890cee71-caee-4f78-aeec-1bb3b56be157",
        requestDate: "2020-01-01T00:00:00Z",
        approvalFlowId: "iam-idc-permission-request",
        requestUserId: "dbf9f494-a8e1-4d9c-833d-f7b673078995",
        approverId: "59c811ab-5111-4e97-b810-e32e500cf314",
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
        isSuccess: true,
        message: expect.any(String),
      });
    });

    it("Testing case where the specified user name does not exist in the user of IamIdc", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");
      const resultAsync = iamIdcApplicationHandler.approvalRequestValidation({
        inputParams: {
          userName: {
            id: "userName",
            value: nonExistUserName,
          },
        },
        inputResources: {
          "iam-idc-aws-account": {
            resourceId: targetAwsAccountId,
            resourceTypeId: resourceTypeIdIamIdcAwsAccount,
          },
          "iam-idc-permission": {
            resourceId: resourceId,
            resourceTypeId: resourceTypeIdIamIdcPermission,
          },
        },
        requestId: "890cee71-caee-4f78-aeec-1bb3b56be157",
        requestDate: "2020-01-01T00:00:00Z",
        approvalFlowId: "iam-idc-permission-request",
        requestUserId: "dbf9f494-a8e1-4d9c-833d-f7b673078995",
        approverId: "59c811ab-5111-4e97-b810-e32e500cf314",
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const value = result.value;
      if (value === undefined) {
        throw new Error("Unexpected undefined value");
      }
      console.log(value);
      expect(value).toEqual({
        isSuccess: false,
        message: expect.any(String),
      });
    });

    it("Testing the successful case of approved in iamIdcApplicationHandler", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");
      const resultAsync = iamIdcApplicationHandler.approved({
        inputParams: {
          userName: {
            id: "userName",
            value: userName,
          },
        },
        inputResources: {
          "iam-idc-aws-account": {
            resourceId: targetAwsAccountId,
            resourceTypeId: resourceTypeIdIamIdcAwsAccount,
          },
          "iam-idc-permission": {
            resourceId: resourceId,
            resourceTypeId: resourceTypeIdIamIdcPermission,
          },
        },
        requestId: "890cee71-caee-4f78-aeec-1bb3b56be157",
        requestDate: "2020-01-01T00:00:00Z",
        approvedDate: "2020-01-01T00:00:00Z",
        approvalFlowId: "iam-idc-permission-request",
        requestUserId: "dbf9f494-a8e1-4d9c-833d-f7b673078995",
        approverId: "59c811ab-5111-4e97-b810-e32e500cf314",
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
        isSuccess: true,
        message: expect.any(String),
      });
    });

    it("Testing the successful case of revoked in iamIdcApplicationHandler", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");
      const resultAsync = iamIdcApplicationHandler.revoked({
        inputParams: {
          userName: {
            id: "userName",
            value: userName,
          },
        },
        inputResources: {
          "iam-idc-aws-account": {
            resourceId: targetAwsAccountId,
            resourceTypeId: resourceTypeIdIamIdcAwsAccount,
          },
          "iam-idc-permission": {
            resourceId: resourceId,
            resourceTypeId: resourceTypeIdIamIdcPermission,
          },
        },
        requestId: "890cee71-caee-4f78-aeec-1bb3b56be157",
        requestDate: "2020-01-01T00:00:00Z",
        approvedDate: "2020-01-01T00:00:00Z",
        revokedDate: "2020-01-01T00:00:00Z",
        approvalFlowId: "iam-idc-permission-request",
        requestUserId: "dbf9f494-a8e1-4d9c-833d-f7b673078995",
        approverId: "59c811ab-5111-4e97-b810-e32e500cf314",
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
        isSuccess: true,
        message: expect.any(String),
      });
    });

    afterAll(async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");
      const resultAsync = iamIdcPermissionResourceHandler.deleteResource({
        resourceTypeId: resourceTypeIdIamIdcPermission,
        resourceId: resourceId,
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const resultAsync2 = awsAccountResourceHandler.deleteResource({
        resourceTypeId: resourceTypeIdIamIdcAwsAccount,
        resourceId: parentResourceId,
      });
      const result2 = await resultAsync2;
      if (result2.isErr()) {
        throw result2.error;
      }
    });
  },
  { timeout: 100000 }
);
