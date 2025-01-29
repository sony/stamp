import { expect, it, describe } from "vitest";
import { listAuditItemsByGroupId, ListAuditItemsByGroupIdInput } from "./listAuditItemsByGroupId";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("listAuditItemsByGroupId", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const config = {
    region: "us-west-2",
    identityInstanceArn: process.env.IDENTITY_INSTANCE_ARN!,
    identityStoreId: process.env.IDENTITY_STORE_ID!,
  };
  const groupId = process.env.GROUP_ID!;
  it("Successful case in listAuditItemsByGroupId", async () => {
    const input: ListAuditItemsByGroupIdInput = {
      groupId: groupId,
    };
    const resultAsync = listAuditItemsByGroupId(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const listPermissionSet = result.value;
    expect(listPermissionSet.AuditItems.length).not.toBe(0);
  });

  it("Successful pagination in listAuditItemsByGroupId", async () => {
    // Assumption: The TEMP_Group contains 2 items
    const input: ListAuditItemsByGroupIdInput = {
      groupId: groupId,
      limit: 1,
    };
    const resultAsync = listAuditItemsByGroupId(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const listPermissionSet1 = result.value;
    expect(listPermissionSet1.AuditItems.length).toBe(1);
    expect(listPermissionSet1.nextToken).not.toBe(undefined);

    const input2: ListAuditItemsByGroupIdInput = {
      groupId: groupId,
      nextToken: listPermissionSet1.nextToken,
      limit: 1,
    };
    const resultAsync2 = listAuditItemsByGroupId(logger, config)(input2);
    const result2 = await resultAsync2;
    if (result2.isErr()) {
      throw result2.error;
    }
    const listPermissionSet2 = result2.value;
    expect(listPermissionSet2.AuditItems.length).toBe(1);
    expect(listPermissionSet1.AuditItems[0]).not.toEqual(listPermissionSet2.AuditItems[0]);
  });

  it("Error test case with invalid format identityStoreId", async () => {
    const errConfig = {
      region: "us-west-2",
      identityInstanceArn: process.env.IDENTITY_INSTANCE_ARN!,
      identityStoreId: "d-xxxxxxxxxx",
    };
    const input: ListAuditItemsByGroupIdInput = {
      groupId: groupId,
    };
    const resultAsync = listAuditItemsByGroupId(logger, errConfig)(input);
    const result = await resultAsync;
    expect(result.isOk()).toBe(false);
  });

  it("Error test case where a non-existent group ID is specified", async () => {
    const input: ListAuditItemsByGroupIdInput = {
      groupId: "00000000-0000-0000-0000-000000000000", // Non-existent group ID
    };
    const resultAsync = listAuditItemsByGroupId(logger, config)(input);
    const result = await resultAsync;
    expect(result.isOk()).toBe(false);
  });
});
