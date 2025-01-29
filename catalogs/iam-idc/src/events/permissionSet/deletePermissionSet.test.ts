import { expect, it, describe, beforeAll } from "vitest";
import { createPermissionSet } from "./createPermissionSet";
import { deletePermissionSet } from "./deletePermissionSet";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("DeletePermissionSet", () => {
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
      managedIamPolicyNames: ["ReadOnlyAccess"],
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

  it("Successful case in DeletePermissionSet", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      permissionSetName: "Unit-test",
      awsAccountId: targetAwsAccountId,
      permissionSetArn: createdPermissionSetArn,
      groupId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const expected = structuredClone(input);
    const resultAsync = deletePermissionSet(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const deletedPermissionSet = result.value;
    expect(deletedPermissionSet).toEqual(expected);
  });

  it("Case where PermissionSet does not exist", async () => {
    if (createdPermissionSetArn === null) throw new Error("createdPermissionSetArn is undefined.");
    const input = {
      permissionSetName: "Unit-test",
      awsAccountId: targetAwsAccountId,
      permissionSetArn: createdPermissionSetArn,
      groupId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const resultAsync = deletePermissionSet(logger, config)(input);
    const result = await resultAsync;
    expect(result.isOk()).toBe(false);
  });
});
