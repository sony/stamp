import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { createPermission, CreatePermissionInput } from "./createPermission";
import { getPermission, GetPermissionInput } from "./getPermission";
import { listPermission, ListPermissionInput } from "./listPermission";
import { listOfAuditItem, ListOfAuditItemInput } from "./listAuditItem";
import { deletePermission, DeletePermissionInput } from "./deletePermission";
import { PermissionInfo } from "../../types/permission";
import { createLogger } from "@stamp-lib/stamp-logger";

import { approved, ApprovedInput } from "../approvalFlow/approved";
import { revoked, RevokedInput } from "../approvalFlow/revoked";

const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
const config = {
  region: "us-west-2",
  identityInstanceArn: process.env.IDENTITY_INSTANCE_ARN!,
  identityStoreId: process.env.IDENTITY_STORE_ID!,
  permissionTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`,
  permissionIdPrefix: "ST",
};
async function createAndApprovePermission(input: CreatePermissionInput, userName1: string, userName2: string) {
  const resultAsync = createPermission(logger, config)(input);
  const result = await resultAsync;
  if (result.isErr()) {
    throw result.error;
  }
  const permissionInfo = result.value;
  const permissionId = permissionInfo.permissionId;
  console.log("permissionId:", permissionId);

  const approvedInput1: ApprovedInput = {
    permissionId: permissionId,
    userName: userName1,
  };

  const resultAsync2 = approved(logger, config)(approvedInput1);
  const result2 = await resultAsync2;
  expect(result2.isSuccess).toBe(true);

  const approvedInput2: ApprovedInput = {
    permissionId: permissionId,
    userName: userName2,
  };

  const resultAsync3 = approved(logger, config)(approvedInput2);
  const result3 = await resultAsync3;
  expect(result3.isSuccess).toBe(true);

  return permissionId;
}

async function revokeAndDeletePermission(permissionId: string, userName1: string, userName2: string) {
  const input1: RevokedInput = {
    permissionId: permissionId,
    userName: userName1,
  };

  const resultAsync = revoked(logger, config)(input1);
  const result = await resultAsync;
  expect(result.isSuccess).toBe(true);

  const input2: RevokedInput = {
    permissionId: permissionId,
    userName: userName2,
  };

  const resultAsync2 = revoked(logger, config)(input2);
  const result2 = await resultAsync2;
  expect(result2.isSuccess).toBe(true);

  const input3: DeletePermissionInput = {
    permissionId: permissionId,
  };
  const resultAsync3 = deletePermission(logger, config)(input3);
  const result3 = await resultAsync3;
  if (result3.isErr()) {
    throw result3.error;
  }
}

describe(
  "Testing the permission workflow",
  () => {
    let permissionId: string | null = null;
    let permissionId1: string | null = null;
    const userName1: string = process.env.EXISTING_USER_NAME!;
    const userName2: string = process.env.EXISTING_USER_NAME_2!;
    const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;
    beforeAll(async () => {
      const input1: CreatePermissionInput = {
        name: "approval workflow unit test1",
        description: "Unit-test-1",
        awsAccountId: targetAwsAccountId,
        permissionSetNameId: "Unit-test1",
        managedIamPolicyNames: ["ReadOnlyAccess"],
        customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Account
        sessionDuration: "PT12H",
      };
      permissionId1 = await createAndApprovePermission(input1, userName1, userName2);
    });

    afterAll(async () => {
      if (permissionId1) {
        await revokeAndDeletePermission(permissionId1, userName1, userName2);
        permissionId1 = null;
      }
    });

    it("normal case of createPermission", async () => {
      const input: CreatePermissionInput = {
        name: "permission workflow unit test",
        description: "Unit-test",
        awsAccountId: targetAwsAccountId,
        permissionSetNameId: "Unit-test",
        customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Account
        managedIamPolicyNames: ["ReadOnlyAccess"],
        sessionDuration: "PT12H",
      };
      const expected: PermissionInfo = {
        name: "permission workflow unit test",
        description: "Unit-test",
        awsAccountId: targetAwsAccountId,
        permissionSetNameId: "Unit-test",
        customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Account
        managedIamPolicyNames: ["ReadOnlyAccess"],
        sessionDuration: "PT12H",
        permissionId: expect.any(String),
        groupId: expect.any(String),
        permissionSetArn: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      };
      const resultAsync = createPermission(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const permissionInfo = result.value;
      expect(permissionInfo).toEqual(expected);
      permissionId = permissionInfo.permissionId;
    });

    it("normal case of getPermission", async () => {
      if (permissionId === null) throw new Error("permissionId is undefined.");

      const input: GetPermissionInput = {
        permissionId: permissionId,
      };
      const expected: PermissionInfo = {
        name: "permission workflow unit test",
        description: "Unit-test",
        awsAccountId: targetAwsAccountId,
        permissionSetNameId: "Unit-test",
        customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Account
        managedIamPolicyNames: ["ReadOnlyAccess"],
        sessionDuration: "PT12H",
        permissionId: expect.any(String),
        groupId: expect.any(String),
        permissionSetArn: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      };
      const resultAsync = getPermission(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const permissionInfo = result.value;
      expect(permissionInfo).toEqual(expected);
    });

    it("normal case of listPermission", async () => {
      const input: ListPermissionInput = {
        awsAccountId: targetAwsAccountId,
        limit: 10,
      };
      const resultAsync = listPermission(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const list = result.value;
      expect(list.items.length).not.toBe(0);
    });

    it("normal case of listOfAuditItem", async () => {
      if (permissionId === null) throw new Error("permissionId is undefined.");
      const input: ListOfAuditItemInput = {
        permissionId: permissionId,
      };
      const resultAsync = listOfAuditItem(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const list = result.value;
      // Currently, there are no users belonging to the Group, so it will be 0 items
      expect(list.values.length).toBe(0);
    });

    it("Testing successful pagination in normal case of listOfAuditItem", async () => {
      if (permissionId1 === null) throw new Error("permissionId1 is undefined.");
      const input1: ListOfAuditItemInput = {
        permissionId: permissionId1,
        nextToken: undefined,
        limit: 1,
      };
      const resultAsync1 = listOfAuditItem(logger, config)(input1);
      const result1 = await resultAsync1;
      if (result1.isErr()) {
        throw result1.error;
      }
      const list1 = result1.value;
      expect(list1.values.length).not.toBe(0);
      expect(list1.nextToken).not.toBe(undefined);

      const input2: ListOfAuditItemInput = {
        permissionId: permissionId1,
        nextToken: list1.nextToken,
        limit: 1,
      };
      const resultAsync2 = listOfAuditItem(logger, config)(input2);
      const result2 = await resultAsync2;
      if (result2.isErr()) {
        throw result2.error;
      }
      const list2 = result2.value;
      expect(list2.values.length).toBe(1);
      expect(list2.nextToken).toBe(undefined);
    });

    it("normal case of deletePermission", async () => {
      if (permissionId === null) throw new Error("permissionId is undefined.");
      const input: DeletePermissionInput = {
        permissionId: permissionId,
      };
      const resultAsync = deletePermission(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(void 0);
    });
  },
  { timeout: 100000 }
);
