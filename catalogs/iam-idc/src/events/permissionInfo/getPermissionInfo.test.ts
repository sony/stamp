import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { getPermissionInfo } from "./getPermissionInfo";
import { RegisterPermissionInput, PermissionInfo } from "../../types/permission";
import { registerPermissionInfo } from "./registerPermission";
import { deletePermissionInfo } from "./deletePermissionInfo";
import { createLogger } from "@stamp-lib/stamp-logger";
describe("getPermissionInfo", () => {
  const tableName: string = `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`;
  const config = { region: "us-west-2" };
  const permissionId = "00000000-1111-2222-3333-444444444444";
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });

  beforeAll(async () => {
    const input: RegisterPermissionInput = {
      name: "stamp-unit-test",
      description: "unit test",
      awsAccountId: "123456789012",
      permissionSetNameId: "123456789012",
      customIamPolicyNames: ["test"],
      managedIamPolicyNames: ["ReadOnlyAccess"],
      sessionDuration: "PT12H",
      permissionId: permissionId,
      groupId: "123456789012",
      permissionSetArn: "arn:aws:iam::123456789012:policy/test",
    };
    const resultAsync = registerPermissionInfo(logger, tableName, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
  });

  it("Should return permissionInfo if db item is found", async () => {
    const expected: PermissionInfo = {
      name: "stamp-unit-test",
      description: "unit test",
      awsAccountId: "123456789012",
      permissionSetNameId: "123456789012",
      customIamPolicyNames: ["test"],
      managedIamPolicyNames: ["ReadOnlyAccess"],
      sessionDuration: "PT12H",
      permissionId: permissionId,
      groupId: "123456789012",
      permissionSetArn: "arn:aws:iam::123456789012:policy/test",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    };

    const result = await getPermissionInfo(logger, tableName, config)({ permissionId: permissionId });

    if (result.isErr()) {
      throw result.error;
    }
    expect.assertions(1);
    if (result.value.isSome()) {
      expect(result.value.value).toStrictEqual(expected);
    }
  });

  it("should return none when db item is not found", async () => {
    const result = await getPermissionInfo(logger, tableName, config)({ permissionId: "non-existent-id" });
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.isNone()).toBe(true);
  });

  afterAll(async () => {
    const input = {
      permissionId: permissionId,
    };
    const resultAsync = deletePermissionInfo(logger, tableName, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
  });
});
