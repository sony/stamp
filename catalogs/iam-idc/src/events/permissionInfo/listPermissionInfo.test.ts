import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { RegisterPermissionInput } from "../../types/permission";
import { registerPermissionInfo } from "./registerPermission";
import { listPermissionInfoByAccountId, ListPermissionInfoByAccountIdInput } from "./listPermissionInfo";
import { deletePermissionInfo } from "./deletePermissionInfo";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("listPermissionInfo", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const tableName: string = `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`;
  const config = { region: "us-west-2" };
  const permissionId = "00000003-1111-2222-3333-444444444444";
  const awsAccountId = "123456789012";

  beforeAll(async () => {
    const input: RegisterPermissionInput = {
      name: "stamp-unit-test",
      description: "unit test",
      awsAccountId: awsAccountId,
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

  it("Successful case in listPermissionInfoByAccountId", async () => {
    const input: ListPermissionInfoByAccountIdInput = {
      awsAccountId: awsAccountId,
    };
    const resultAsync = listPermissionInfoByAccountId(logger, tableName, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const listPermissionInfo = result.value;
    expect(listPermissionInfo.items.length).not.toBe(0);
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
