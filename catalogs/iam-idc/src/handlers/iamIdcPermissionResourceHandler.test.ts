import { expect, it, describe } from "vitest";
import { ResourceOutput } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { createIamIdcPermissionResourceHandler } from "./iamIdcPermissionResourceHandler";
import { some } from "@stamp-lib/stamp-option";

const resourceTypeId: string = "iam-idc-permission";
const identityInstanceArn: string = process.env.IDENTITY_INSTANCE_ARN!;
const identityStoreId: string = process.env.IDENTITY_STORE_ID!;
const region: string = "us-west-2";
const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;
const iamIdcAwsAccountId: string = process.env.IAM_IDC_AWS_ACCOUNT_ID!;
const parentResourceId: string = targetAwsAccountId;
const accountManagementTableName: string = `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`;
const permissionTableName: string = `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`;

const name: string = "permission handler unit test";
const description: string = "Unit-test";
const permissionSetNameId: string = "Unit-test";
const sessionDuration: string = "PT12H";
const managedIamPolicyNames: string[] = ["ReadOnlyAccess"];
const customIamPolicyNames: string[] = [`Stamp-Unit-test-${targetAwsAccountId}`]; // Custom policy created in target AWS Accoun
const permissionSetName: string = `Stamp-Unit-test-${targetAwsAccountId}`;

const nineManagedIamPolicyNames: string[] = [
  "ServiceQuotasReadOnlyAccess",
  "AmazonCognitoReadOnly",
  "AmazonS3ReadOnlyAccess",
  "AmazonDynamoDBReadOnlyAccess",
  "AmazonRDSReadOnlyAccess",
  "AWSLambda_ReadOnlyAccess",
  "AWSXRayReadOnlyAccess",
  "AmazonEC2ReadOnlyAccess",
  "AmazonElasticFileSystemReadOnlyAccess",
];

describe(
  "Testing the iamIdcPermissionResourceHandler",
  () => {
    const iamIdcPermissionResourceHandler = createIamIdcPermissionResourceHandler({
      region: region,
      identityInstanceArn: identityInstanceArn,
      identityStoreId: identityStoreId,
      accountId: iamIdcAwsAccountId,
      accountManagementTableName: accountManagementTableName,
      permissionTableName: permissionTableName,
      logLevel: "DEBUG",
      permissionIdPrefix: "ST",
    });
    let resourceId: string | null = null;

    it("Testing the successful case of createResource in iamIdcPermissionResourceHandler", async () => {
      const resultAsync = iamIdcPermissionResourceHandler.createResource({
        resourceTypeId: resourceTypeId,
        inputParams: {
          name: name,
          description: description,
          sessionDuration: sessionDuration,
          permissionSetNameId: permissionSetNameId,
          managedIamPolicyNames: managedIamPolicyNames,
          customIamPolicyNames: customIamPolicyNames,
        },
        parentResourceId: parentResourceId,
      });
      const expected: ResourceOutput = {
        name: name,
        resourceId: expect.any(String),
        params: {
          description: description,
          sessionDuration: sessionDuration,
          permissionSetNameId: permissionSetNameId,
          managedIamPolicyNames: managedIamPolicyNames,
          customIamPolicyNames: customIamPolicyNames,
        },
      };
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const resourceOutput = result.value;
      expect(resourceOutput).toEqual(expected);
      resourceId = resourceOutput.resourceId;
    });

    it("Testing the successful case of getResource in iamIdcPermissionResourceHandler", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");
      const resultAsync = iamIdcPermissionResourceHandler.getResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
      });
      const expected: ResourceOutput = {
        name: name,
        resourceId: expect.any(String),
        parentResourceId: parentResourceId,
        params: {
          description: description,
          sessionDuration: sessionDuration,
          permissionSetNameId: permissionSetNameId,
          managedIamPolicyNames: managedIamPolicyNames,
          customIamPolicyNames: customIamPolicyNames,
        },
      };
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const value = result.value;
      if (value === undefined) {
        throw new Error("Unexpected undefined value");
      }
      expect(value).toEqual(some(expected));
    });

    it("Testing the successful case of listResources in awsAccountResourceHandler", async () => {
      const resultAsync = iamIdcPermissionResourceHandler.listResources({
        resourceTypeId: resourceTypeId,
        parentResourceId: parentResourceId,
        prefix: {
          type: "name",
          value: permissionSetName,
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
      if (resourceId === null) throw new Error("resourceId undefined.");
      const resultAsync = iamIdcPermissionResourceHandler.listResourceAuditItem({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const listResourceAuditItemOutput = result.value;
      expect(Array.isArray(listResourceAuditItemOutput.auditItems)).toBe(true);
    });

    it("Testing the successful case of deleteResource in iamIdcPermissionResourceHandler", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");
      const resultAsync = iamIdcPermissionResourceHandler.deleteResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
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

describe(
  "Testing condition check of createResource in iamIdcPermissionResourceHandler",
  () => {
    const iamIdcPermissionResourceHandler = createIamIdcPermissionResourceHandler({
      region: region,
      identityInstanceArn: identityInstanceArn,
      identityStoreId: identityStoreId,
      accountId: iamIdcAwsAccountId,
      accountManagementTableName: accountManagementTableName,
      permissionTableName: permissionTableName,
      logLevel: "DEBUG",
      permissionIdPrefix: "ST",
    });
    let resourceId: string | null = null;

    it("should fail to createResource when managedIamPolicyNames and customIamPolicyNames exceed 10", async () => {
      const excessiveManagedIamPolicyNames = Array(6).fill("ManagedPolicy");
      const excessiveCustomIamPolicyNames = Array(5).fill("CustomPolicy");

      const resultAsync = iamIdcPermissionResourceHandler.createResource({
        resourceTypeId: resourceTypeId,
        inputParams: {
          name: name,
          description: description,
          sessionDuration: sessionDuration,
          permissionSetNameId: permissionSetNameId,
          managedIamPolicyNames: excessiveManagedIamPolicyNames,
          customIamPolicyNames: excessiveCustomIamPolicyNames,
        },
        parentResourceId: parentResourceId,
      });

      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("The total number of customIamPolicyNames and managedIamPolicyNames cannot exceed 10");
    });

    it("should succeed to createResource when managedIamPolicyNames and customIamPolicyNames are less than or equal to 10", async () => {
      const result = await iamIdcPermissionResourceHandler.createResource({
        resourceTypeId: resourceTypeId,
        inputParams: {
          name: name,
          description: description,
          sessionDuration: sessionDuration,
          permissionSetNameId: permissionSetNameId,
          managedIamPolicyNames: nineManagedIamPolicyNames,
          customIamPolicyNames: customIamPolicyNames,
        },
        parentResourceId: parentResourceId,
      });
      expect(result.isOk()).toBe(true);
      resourceId = result._unsafeUnwrap().resourceId;

      // Clean up
      const deleteResult = await iamIdcPermissionResourceHandler.deleteResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
      });
      expect(deleteResult.isOk()).toBe(true);
    });
  },
  { timeout: 100000 }
);
