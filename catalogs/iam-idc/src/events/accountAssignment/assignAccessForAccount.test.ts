import { DeleteAccountAssignmentCommand, SSOAdminClient } from "@aws-sdk/client-sso-admin";
import { createLogger } from "@stamp-lib/stamp-logger";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attachCustomerManagedPolicy } from "../attachedManagedPolicy/attachCustomerManagedPolicy";
import { createGroup } from "../group/createGroup";
import { deleteGroup } from "../group/createGroup.test";
import { createPermissionSet } from "../permissionSet/createPermissionSet";
import { deletePermissionSet } from "../permissionSet/createPermissionSet.test";
import { provisionPermissionSet } from "../permissionSet/provisionPermissionSet";
import { assignAccessForAccount } from "./assignAccessForAccount";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe("assignAccessForAccount", () => {
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
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Account
      awsAccountId: targetAwsAccountId,
      permissionId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const resultAsync = createPermissionSet(logger, config)(input)
      .andThen(attachCustomerManagedPolicy(logger, config))
      .andThen(createGroup(logger, config))
      .andThen(provisionPermissionSet(logger, config));
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    createdPermissionSetArn = createdPermissionSet.permissionSetArn;
    groupId = createdPermissionSet.groupId;
  });

  it("Successful case in assignAccessForAccount", async () => {
    if (createdPermissionSetArn === null || groupId === null) throw new Error("createdPermissionSetArn or groupId is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Account
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
      groupId: groupId,
    };
    const expected = structuredClone(input);
    const resultAsync = assignAccessForAccount(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  it("should return PermissionSetInfo when ManagedPolicies assigned", async () => {
    if (createdPermissionSetArn === null || groupId === null) throw new Error("createdPermissionSetArn or groupId is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Account
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
      groupId: groupId,
    };
    const expected = structuredClone(input);
    const resultAsync = assignAccessForAccount(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toStrictEqual(expected);
  });

  it("Case where a non-existent GroupId is specified", async () => {
    if (createdPermissionSetArn === null || groupId === null) throw new Error("createdPermissionSetArn or groupId is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Account
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: createdPermissionSetArn,
      groupId: "groupId", // non-existent GroupId
    };
    const resultAsync = assignAccessForAccount(logger, config)(input);
    const result = await resultAsync;
    expect(result.isErr()).toBe(true);
  });

  afterAll(async () => {
    // Unassign the created PermissionSet if it assigned
    if (createdPermissionSetArn && groupId) {
      // To avoid ConflictException, wait 5 seconds
      console.log("wait 5 second");
      await sleep(5000);

      await unassignAccessForAccount(identityInstanceArn, createdPermissionSetArn, targetAwsAccountId, groupId);
    }

    // Delete the created Group if it exists
    if (identityStoreId && groupId) {
      await deleteGroup(identityStoreId, groupId);
      groupId = null;
    }

    // Delete the created PermissionSet if it exists
    if (createdPermissionSetArn) {
      // To avoid ConflictException, wait 1 second
      console.log("wait 1 second");
      await sleep(1000);

      await deletePermissionSet(identityInstanceArn, createdPermissionSetArn);
      createdPermissionSetArn = null;
    }
  });
});

const unassignAccessForAccount: (instanceArn: string, permissionSetArn: string, awsAccountId: string, groupId: string) => Promise<void> = async (
  instanceArn,
  permissionSetArn,
  awsAccountId,
  groupId
) => {
  const region: string = "us-west-2";
  const client = new SSOAdminClient({ region: region });
  const command = new DeleteAccountAssignmentCommand({
    InstanceArn: instanceArn,
    TargetId: awsAccountId,
    TargetType: "AWS_ACCOUNT",
    PermissionSetArn: permissionSetArn,
    PrincipalType: "GROUP",
    PrincipalId: groupId,
  });
  await client.send(command);
};
