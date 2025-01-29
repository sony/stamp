import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { attachCustomerManagedPolicy } from "./attachCustomerManagedPolicy";
import { createPermissionSet } from "../permissionSet/createPermissionSet";
import { deletePermissionSet } from "../permissionSet/createPermissionSet.test";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("attachCustomerManagedPolicy", () => {
  let createdPermissionSetArn: string | null = null;
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const identityInstanceArn = process.env.IDENTITY_INSTANCE_ARN!;
  const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;

  const config = {
    region: region,
    identityInstanceArn: identityInstanceArn,
  };
  beforeAll(async () => {
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      managedIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      permissionId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const resultAsync = createPermissionSet(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    if (createdPermissionSet.permissionSetArn === undefined) {
      throw new Error("permissionSetArn is undefined after creation.");
    }
    createdPermissionSetArn = createdPermissionSet.permissionSetArn;
  });

  it("Successful case in attachCustomerManagedPolicy", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      managedIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const expected = structuredClone(input);
    const resultAsync = attachCustomerManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  it("Successful case not specify customIamPolicyNames", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [],
      managedIamPolicyNames: ["ReadOnlyAccess"],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const expected = structuredClone(input);
    const resultAsync = attachCustomerManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  it("Successful case even if policy is not exist", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: ["non-existent-policy"], // Custom policy that does not exist
      managedIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const expected = structuredClone(input);
    const resultAsync = attachCustomerManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  it("unsuccessful case where a policy name is invalid", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: ["non-existent policy"], // Custom policy that does not exist
      managedIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const resultAsync = attachCustomerManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    expect(result.isOk()).toBe(false);
  });

  it("should return PermissionSetInfo when ManagedPolicies attached", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      managedIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const expected = structuredClone(input);
    const resultAsync = attachCustomerManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  afterAll(async () => {
    // Delete the created PermissionSet if it exists
    if (createdPermissionSetArn) {
      await deletePermissionSet(identityInstanceArn, createdPermissionSetArn);
      createdPermissionSetArn = null;
    }
  });
});
