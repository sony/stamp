import { expect, it, describe, afterAll } from "vitest";
import { RegisterPermissionInput, PermissionInfo } from "../../types/permission";
import { registerPermissionInfo } from "./registerPermission";
import { deletePermissionInfo } from "./deletePermissionInfo";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("registerPermissionInfo", () => {
  const tableName: string = `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`;
  const config = { region: "us-west-2" };
  const permissionId = "00000001-1111-2222-3333-444444444444";
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });

  it("should return a ResultAsync", async () => {
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

    const resultAsync = registerPermissionInfo(logger, tableName, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const permissionInfo = result.value;
    expect(permissionInfo).toEqual(expected);
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
