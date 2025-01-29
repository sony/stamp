import { expect, it, describe, beforeEach, afterEach } from "vitest";
import { attachManagedPolicy } from "./attachManagedPolicy";
import { createPermissionSet } from "../permissionSet/createPermissionSet";
import { deletePermissionSet } from "../permissionSet/createPermissionSet.test";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("attachManagedPolicy", () => {
  let createdPermissionSetArn: string | null = null;
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const identityInstanceArn = process.env.IDENTITY_INSTANCE_ARN!;
  const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;
  const config = {
    region: region,
    identityInstanceArn: identityInstanceArn,
  };
  beforeEach(async () => {
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: [],
      customIamPolicyNames: [],
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

  it("Successful case in attachManagedPolicy", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const expected = structuredClone(input);
    const resultAsync = attachManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  it("Successful case that attaching multiple managedIamPolicyNames", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess", "AWSLambda_ReadOnlyAccess"],
      customIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const expected = structuredClone(input);
    const resultAsync = attachManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  it("Successful case that not specify managedIamPolicyNames", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: [],
      customIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const expected = structuredClone(input);
    const resultAsync = attachManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  it("unsuccessful case that policy is invalid", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["invalid policy"], // Invalid due to blank field
      customIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const resultAsync = attachManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.userMessage).toContain("Given managed policy ARN");
    }
  });

  it("unsuccessful case that a non-existent policy is specified", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["non-existent-policy"], // Non existent policy
      customIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const resultAsync = attachManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.userMessage).toContain("Policy does not exist");
    }
  });

  it("should return PermissionSetInfo when customIamPolicyNames attached", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: [],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
    };
    const expected = structuredClone(input);
    const resultAsync = attachManagedPolicy(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  afterEach(async () => {
    // Delete the created PermissionSet if it exists
    if (createdPermissionSetArn) {
      await deletePermissionSet(identityInstanceArn, createdPermissionSetArn);
    }
  });
});
