import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { createPermissionSet } from "./createPermissionSet";
import { attachCustomerManagedPolicy } from "../attachedManagedPolicy/attachCustomerManagedPolicy";
import { createGroup } from "../group/createGroup";
import { provisionPermissionSet } from "./provisionPermissionSet";
import { deletePermissionSet } from "./createPermissionSet.test";
import { deleteGroup } from "../group/createGroup.test";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("provisionPermissionSet", () => {
  let createdPermissionSetArn: string | null = null;
  let groupId: string | null = null;
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const identityInstanceArn = process.env.IDENTITY_INSTANCE_ARN!;
  const identityStoreId = process.env.IDENTITY_STORE_ID!;
  const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;

  const config = {
    region: region,
    identityInstanceArn: identityInstanceArn,
    identityStoreId: identityStoreId,
  };
  beforeAll(async () => {
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`],
      managedIamPolicyNames: ["ReadOnlyAccess"],
      awsAccountId: targetAwsAccountId,
      permissionId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const resultAsync = createPermissionSet(logger, config)(input).andThen(attachCustomerManagedPolicy(logger, config)).andThen(createGroup(logger, config));
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    createdPermissionSetArn = createdPermissionSet.permissionSetArn;
    groupId = createdPermissionSet.groupId;
  });

  it("Successful case in provisionPermissionSet", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      managedIamPolicyNames: ["ReadOnlyAccess"],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
      groupId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const expected = structuredClone(input);
    const resultAsync = provisionPermissionSet(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toEqual(expected);
  });

  it("should return PermissionSetInfo when ManagedPolicies provisioned", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      managedIamPolicyNames: ["ReadOnlyAccess"],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
      groupId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const expected = structuredClone(input);
    const resultAsync = provisionPermissionSet(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toEqual(expected);
  });

  afterAll(async () => {
    // Delete the created Group if it exists
    if (identityStoreId && groupId) {
      await deleteGroup(identityStoreId, groupId);
      groupId = null;
    }

    // Delete the created PermissionSet if it exists
    if (createdPermissionSetArn) {
      await deletePermissionSet(identityInstanceArn, createdPermissionSetArn);
      createdPermissionSetArn = null;
    }
  });
});
