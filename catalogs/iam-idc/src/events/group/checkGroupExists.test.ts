import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { checkGroupExists, GroupExistsError } from "./checkGroupExists";
import { createGroup } from "./createGroup";
import { deleteGroup } from "./deleteGroup";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("checkGroupExists", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  let createdGroupId: string | null = null;
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

  const testGroupName = `Stamp-checkGroupExists-test-${targetAwsAccountId}`;

  beforeAll(async () => {
    // Create a test group for testing
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [],
      awsAccountId: targetAwsAccountId,
      groupName: testGroupName,
      permissionSetName: `Stamp-checkGroupExists-test-${targetAwsAccountId}`,
      permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-checkGroupExists-test-${targetAwsAccountId}`,
    };
    const resultAsync = createGroup(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    createdGroupId = result.value.groupId;
  });

  afterAll(async () => {
    // Clean up the test group
    if (createdGroupId) {
      const input = {
        permissionSetName: `Stamp-checkGroupExists-test-${targetAwsAccountId}`,
        awsAccountId: targetAwsAccountId,
        permissionSetArn: `arn:aws:sso:::permissionSet/${identityInstanceId}/ps-checkGroupExists-test-${targetAwsAccountId}`,
        groupId: createdGroupId,
      };
      const resultAsync = deleteGroup(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
    }
  });

  it("should return error when group already exists", async () => {
    const input = {
      groupName: testGroupName,
    };

    const resultAsync = checkGroupExists(logger, config)(input);
    const result = await resultAsync;

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GroupExistsError);
    expect(error.type).toBe("GroupAlreadyExists");
    expect(error.groupName).toBe(testGroupName);
    expect(error.message).toContain(`Group "${testGroupName}" already exists`);
  });

  it("should succeed when group does not exist", async () => {
    const nonExistentGroupName = `Stamp-nonexistent-test-${Date.now()}`;
    const input = {
      groupName: nonExistentGroupName,
    };

    const resultAsync = checkGroupExists(logger, config)(input);
    const result = await resultAsync;

    expect(result.isOk()).toBe(true);
    const value = result._unsafeUnwrap();
    expect(value).toEqual(input);
  });

  it("should be case-insensitive (detect existing group with different case)", async () => {
    // Test with uppercase version of the group name
    const upperCaseGroupName = testGroupName.toUpperCase();
    const input = {
      groupName: upperCaseGroupName,
    };

    const resultAsync = checkGroupExists(logger, config)(input);
    const result = await resultAsync;

    // Should return error because IAM IdC treats group names case-insensitively
    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GroupExistsError);
    expect(error.type).toBe("GroupAlreadyExists");
    expect(error.message).toContain("already exists");
  });
});
