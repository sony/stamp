import { expect, it, describe, afterAll } from "vitest";
import { createGroup } from "./createGroup";
import { IdentitystoreClient, DeleteGroupCommand } from "@aws-sdk/client-identitystore";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("createGroup", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  let groupId: string | null = null;
  const region = "us-west-2";
  const identityInstanceArn = process.env.IDENTITY_INSTANCE_ARN!;
  const identityInstanceId = process.env.IDENTITY_INSTANCE_ID!;
  const identityStoreId = process.env.IDENTITY_STORE_ID!;
  const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;

  const config = {
    region: region,
    identityInstanceArn: identityInstanceArn,
    identityStoreId: identityStoreId,
  };
  it("should return a ResultAsync", async () => {
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-Unit-test-${targetAwsAccountId}`,
    };
    const expected = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-Unit-test-${targetAwsAccountId}`,
      groupId: expect.any(String),
    };
    const resultAsync = createGroup(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    if (createdPermissionSet.groupId === undefined) {
      throw new Error("GroupID is undefined after group creation.");
    }
    expect(createdPermissionSet).toEqual(expected);

    groupId = createdPermissionSet.groupId;
  });

  it("should return group when group exists", async () => {
    if (groupId === null) throw new Error("groupId is undefined.");
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-Unit-test-${targetAwsAccountId}`,
    };
    const expected = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-Unit-test-${targetAwsAccountId}`,
      groupId: expect.any(String),
    };
    const resultAsync = createGroup(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    if (createdPermissionSet.groupId === undefined) {
      throw new Error("GroupID is undefined after group creation.");
    }
    expect(createdPermissionSet).toEqual(expected);
  });

  it("Error test case with invalid format identityStoreId", async () => {
    const errConfig = {
      region: region,
      identityInstanceArn: identityInstanceArn,
      identityStoreId: "d-xxxxxxxxxx",
    };
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-Unit-test-${targetAwsAccountId}`,
    };
    const resultAsync = createGroup(logger, errConfig)(input);
    const result = await resultAsync;
    expect(result.isOk()).toBe(false);
  });

  afterAll(async () => {
    // Delete the created Group if it exists
    if (groupId) {
      await deleteGroup(identityStoreId, groupId);
      groupId = null;
    }
  });
});

export const deleteGroup: (identityStoreId: string, groupId: string) => Promise<void> = async (identityStoreId, groupId) => {
  const region: string = "us-west-2";
  const client = new IdentitystoreClient({ region: region });
  const command = new DeleteGroupCommand({
    IdentityStoreId: identityStoreId,
    GroupId: groupId,
  });
  await client.send(command);
};
