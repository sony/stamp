import { expect, it, describe, afterAll } from "vitest";
import { createPermissionSet } from "./createPermissionSet";
import { SSOAdminClient, DeletePermissionSetCommand } from "@aws-sdk/client-sso-admin";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("CreatePermissionSet", () => {
  let createdPermissionSetArn: string | null = null;
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const identityInstanceArn = process.env.IDENTITY_INSTANCE_ARN!;
  const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;

  const config = {
    region: region,
    identityInstanceArn: identityInstanceArn,
  };
  it("Successful case in createPermissionSet", async () => {
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      managedIamPolicyNames: ["ReadOnlyAccess"],
      awsAccountId: targetAwsAccountId,
      permissionId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const expected = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      managedIamPolicyNames: ["ReadOnlyAccess"],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: expect.any(String),
    };
    const resultAsync = createPermissionSet(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toEqual(expected);
    createdPermissionSetArn = createdPermissionSet.permissionSetArn;
  });

  it("should return PermissionSetArn when PermissionSet exists", async () => {
    const input = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      managedIamPolicyNames: ["ReadOnlyAccess"],
      awsAccountId: targetAwsAccountId,
      permissionId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const expected = {
      sessionDuration: "PT12H",
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      managedIamPolicyNames: ["ReadOnlyAccess"],
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: expect.any(String),
    };
    const resultAsync = createPermissionSet(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    expect(createdPermissionSet).toEqual(expected);
  });

  afterAll(async () => {
    // Delete the created PermissionSet if it exists
    if (createdPermissionSetArn) {
      await deletePermissionSet(identityInstanceArn, createdPermissionSetArn);
      createdPermissionSetArn = null;
    }
  });
});

export const deletePermissionSet: (instanceArn: string, permissionSetArn: string) => Promise<void> = async (instanceArn, permissionSetArn) => {
  const region: string = "us-west-2";
  const client = new SSOAdminClient({ region: region });
  const command = new DeletePermissionSetCommand({
    InstanceArn: instanceArn,
    PermissionSetArn: permissionSetArn,
  });
  await client.send(command);
};
