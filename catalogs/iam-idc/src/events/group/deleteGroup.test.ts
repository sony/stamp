import { expect, it, describe, beforeAll } from "vitest";
import { createGroup } from "./createGroup";
import { deleteGroup } from "./deleteGroup";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("deleteGroup", () => {
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
  beforeAll(async () => {
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
      awsAccountId: targetAwsAccountId,
      groupName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetName: `Stamp-Unit-test-${targetAwsAccountId}`,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-Unit-test-${targetAwsAccountId}`,
    };
    const resultAsync = createGroup(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    groupId = createdPermissionSet.groupId;
  });

  it("Successful case in DeleteGroup", async () => {
    if (groupId === null) throw new Error("groupId is undefined.");
    const input = {
      permissionSetName: "Unit-test",
      awsAccountId: targetAwsAccountId,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-Unit-test-${targetAwsAccountId}`,
      groupId: groupId,
    };
    const expected = structuredClone(input);
    const resultAsync = deleteGroup(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const validatedPermissionSetForDelete = result.value;
    expect(validatedPermissionSetForDelete).toEqual(expected);
  });

  it("Case where group does not exist", async () => {
    if (groupId === null) throw new Error("groupId is undefined.");
    const input = {
      permissionSetName: "Unit-test",
      awsAccountId: targetAwsAccountId,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-Unit-test-${targetAwsAccountId}`,
      groupId: "Not Found GroupId",
    };
    const resultAsync = deleteGroup(logger, config)(input);
    const result = await resultAsync;
    expect(result.isOk()).toBe(false);
  });

  it("Error test case with invalid format identityStoreId", async () => {
    const errConfig = {
      region: region,
      identityInstanceArn: identityInstanceArn,
      identityStoreId: "d-xxxxxxxxxx",
    };
    const input = {
      permissionSetName: "Unit-test",
      awsAccountId: targetAwsAccountId,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-Unit-test-${targetAwsAccountId}`,
      groupId: "Not Found GroupId",
    };
    const resultAsync = deleteGroup(logger, errConfig)(input);
    const result = await resultAsync;
    expect(result.isOk()).toBe(false);
  });
});
