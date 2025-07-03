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
const customIamPolicyNames: string[] = [`Stamp-Unit-test-${targetAwsAccountId}`]; // Custom policy created in target AWS Account
const anotherCustomIamPolicyNames: string[] = [`Stamp-Unit-test-another-${targetAwsAccountId}`]; // Custom policy created in target AWS Account
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

describe(
  "Testing updateResource in iamIdcPermissionResourceHandler",
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

    // Setup: Create a resource to update
    it("Setup: Create a permission resource for update testing", async () => {
      const resultAsync = iamIdcPermissionResourceHandler.createResource({
        resourceTypeId: resourceTypeId,
        inputParams: {
          name: name,
          description: description,
          sessionDuration: sessionDuration,
          permissionSetNameId: permissionSetNameId,
          managedIamPolicyNames: ["ReadOnlyAccess"],
          customIamPolicyNames: [],
        },
        parentResourceId: parentResourceId,
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      resourceId = result.value.resourceId;
      expect(resourceId).toBeDefined();
    });

    it("Testing successful updateResource - description only", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: {
          description: `${description}-updated`,
        },
      });

      expect(updateResult.isOk()).toBe(true);

      const updatedResource = updateResult._unsafeUnwrap();
      expect(updatedResource.params.description).toBe(`${description}-updated`);
      expect(updatedResource.resourceId).toBe(resourceId);
    });

    it("Testing successful updateResource - session duration only", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      const newSessionDuration = "PT8H";
      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: {
          sessionDuration: newSessionDuration,
        },
      });

      expect(updateResult.isOk()).toBe(true);

      const updatedResource = updateResult._unsafeUnwrap();
      expect(updatedResource.params.sessionDuration).toBe(newSessionDuration);
      expect(updatedResource.resourceId).toBe(resourceId);
    });

    it("Testing successful updateResource - managed policies only", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      const newManagedPolicies = ["AWSLambda_ReadOnlyAccess"];
      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: {
          managedIamPolicyNames: newManagedPolicies,
        },
      });

      expect(updateResult.isOk()).toBe(true);

      const updatedResource = updateResult._unsafeUnwrap();
      expect(updatedResource.params.managedIamPolicyNames).toEqual(newManagedPolicies);
      expect(updatedResource.resourceId).toBe(resourceId);
    });

    it("Testing successful updateResource - custom policies only", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: {
          customIamPolicyNames: anotherCustomIamPolicyNames,
        },
      });

      expect(updateResult.isOk()).toBe(true);
      if (updateResult.isOk()) {
        const updatedResource = updateResult.value;
        expect(updatedResource.params.customIamPolicyNames).toEqual(anotherCustomIamPolicyNames);
        expect(updatedResource.resourceId).toBe(resourceId);
      }
    });

    it("Testing successful updateResource - multiple parameters", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      const updateParams = {
        description: `${description}-multi-update`,
        sessionDuration: "PT6H",
        managedIamPolicyNames: ["AmazonS3ReadOnlyAccess"],
        customIamPolicyNames: customIamPolicyNames,
      };

      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: updateParams,
      });

      expect(updateResult.isOk()).toBe(true);
      const updatedResource = updateResult._unsafeUnwrap();
      expect(updatedResource.params.description).toBe(updateParams.description);
      expect(updatedResource.params.sessionDuration).toBe(updateParams.sessionDuration);
      expect(updatedResource.params.managedIamPolicyNames).toEqual(updateParams.managedIamPolicyNames);
      expect(updatedResource.params.customIamPolicyNames).toEqual(updateParams.customIamPolicyNames);
      expect(updatedResource.resourceId).toBe(resourceId);
    });

    it("Testing updateResource with empty policies (removal)", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: {
          managedIamPolicyNames: [],
          customIamPolicyNames: [],
        },
      });

      expect(updateResult.isOk()).toBe(true);
      const updatedResource = updateResult._unsafeUnwrap();
      expect(updatedResource.params.managedIamPolicyNames).toEqual([]);
      expect(updatedResource.params.customIamPolicyNames).toEqual([]);
      expect(updatedResource.resourceId).toBe(resourceId);
    });

    it("Testing updateResource failure - resource not found", async () => {
      const nonExistentResourceId = "non-existent-resource-id";

      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: nonExistentResourceId,
        updateParams: {
          description: "should fail",
        },
      });

      expect(updateResult.isErr()).toBe(true);
      if (updateResult.isErr()) {
        expect(updateResult.error.message).toContain("Permission not found");
      }
    });

    it("Testing updateResource failure - too many policies", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      const tooManyManagedPolicies = Array(6).fill("ManagedPolicy");
      const tooManyCustomPolicies = Array(5).fill("CustomPolicy");

      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: {
          managedIamPolicyNames: tooManyManagedPolicies,
          customIamPolicyNames: tooManyCustomPolicies,
        },
      });

      expect(updateResult.isErr()).toBe(true);
      expect(updateResult._unsafeUnwrapErr().message).toContain("The total number of customIamPolicyNames and managedIamPolicyNames cannot exceed 10");
    });

    it("Testing updateResource with valid policy limit (exactly 10)", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      const tenManagedPolicies = [
        "ReadOnlyAccess",
        "AWSDataSyncReadOnlyAccess",
        "AmazonS3ReadOnlyAccess",
        "AmazonDynamoDBReadOnlyAccess",
        "AmazonRDSReadOnlyAccess",
        "AWSLambda_ReadOnlyAccess",
        "AWSXRayReadOnlyAccess",
        "AmazonEC2ReadOnlyAccess",
        "AmazonElasticFileSystemReadOnlyAccess",
        "ServiceQuotasReadOnlyAccess",
      ];

      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: {
          managedIamPolicyNames: tenManagedPolicies,
          customIamPolicyNames: [],
        },
      });

      expect(updateResult.isOk()).toBe(true);
      if (updateResult.isOk()) {
        const updatedResource = updateResult.value;
        expect(updatedResource.params.managedIamPolicyNames).toEqual(tenManagedPolicies);
        expect(updatedResource.params.customIamPolicyNames).toEqual([]);
      }
    });

    it("Testing updateResource - verify resource is accessible after update", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      // Get the resource to verify it's still accessible
      const getResult = await iamIdcPermissionResourceHandler.getResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
      });

      expect(getResult.isOk()).toBe(true);
      expect(
        getResult._unsafeUnwrap().unwrapOr({
          params: {},
          name: "",
          resourceId: "",
        }).resourceId
      ).toBe(resourceId);
    });

    // Cleanup: Delete the test resource
    it("Cleanup: Delete the test permission resource", async () => {
      if (resourceId === null) throw new Error("resourceId undefined.");

      const deleteResult = await iamIdcPermissionResourceHandler.deleteResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
      });

      expect(deleteResult.isOk()).toBe(true);
    });
  },
  { timeout: 300000 } // Longer timeout for AWS operations including provisioning
);

describe(
  "Testing updateResource edge cases in iamIdcPermissionResourceHandler",
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

    it("Testing updateResource with empty update params", async () => {
      // First create a resource
      const createResult = await iamIdcPermissionResourceHandler.createResource({
        resourceTypeId: resourceTypeId,
        inputParams: {
          name: name,
          description: description,
          sessionDuration: sessionDuration,
          permissionSetNameId: permissionSetNameId,
          managedIamPolicyNames: ["ReadOnlyAccess"],
          customIamPolicyNames: [],
        },
        parentResourceId: parentResourceId,
      });

      expect(createResult.isOk()).toBe(true);
      if (createResult.isErr()) throw createResult.error;

      const resourceId = createResult.value.resourceId;

      // Try to update with empty params
      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: {},
      });

      expect(updateResult.isOk()).toBe(true);
      expect(updateResult._unsafeUnwrap().resourceId).toBe(resourceId);

      // Cleanup
      await iamIdcPermissionResourceHandler.deleteResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
      });
    });

    it("Testing updateResource with invalid session duration format", async () => {
      // First create a resource
      const createResult = await iamIdcPermissionResourceHandler.createResource({
        resourceTypeId: resourceTypeId,
        inputParams: {
          name: name,
          description: description,
          sessionDuration: sessionDuration,
          permissionSetNameId: permissionSetNameId,
          managedIamPolicyNames: [],
          customIamPolicyNames: [],
        },
        parentResourceId: parentResourceId,
      });

      if (createResult.isErr()) throw createResult.error;

      const resourceId = createResult.value.resourceId;

      // Try to update with invalid session duration
      const updateResult = await iamIdcPermissionResourceHandler.updateResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        updateParams: {
          sessionDuration: "invalid-duration",
        },
      });

      expect(updateResult.isErr()).toBe(true);
      expect(updateResult._unsafeUnwrapErr().message).toContain("Failed to update permission");

      // Cleanup
      await iamIdcPermissionResourceHandler.deleteResource({
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
      });
    });
  },
  { timeout: 200000 }
);
