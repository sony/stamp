import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { approved, ApprovedInput } from "../approvalFlow/approved";
import { revoked, RevokedInput } from "../approvalFlow/revoked";
import { listAuditItem } from "./listAuditItem";
import { createPermission, CreatePermissionInput } from "../permission/createPermission";
import { deletePermission, DeletePermissionInput } from "../permission/deletePermission";
import { createLogger } from "@stamp-lib/stamp-logger";

describe(
  "Testing the approval workflow",
  () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
    const userName: string = process.env.EXISTING_USER_NAME!;
    const targetAwsAccountId: string = process.env.TARGET_AWS_ACCOUNT_ID!;
    const config = {
      region: "us-west-2",
      identityInstanceArn: process.env.IDENTITY_INSTANCE_ARN!,
      identityStoreId: process.env.IDENTITY_STORE_ID!,
      permissionTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`,
      accountManagementTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`,
      permissionIdPrefix: "ST",
    };
    let permissionId1: string | null = null;
    let permissionId2: string | null = null;

    async function createAndApprovePermission(input: CreatePermissionInput, userName: string) {
      const resultAsync = createPermission(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const permissionInfo = result.value;
      const permissionId = permissionInfo.permissionId;
      console.log("permissionId:", permissionId);

      const approvedInput: ApprovedInput = {
        permissionId: permissionId,
        userName: userName,
      };

      const resultAsync2 = approved(logger, config)(approvedInput);
      const result2 = await resultAsync2;
      expect(result2.isSuccess).toBe(true);

      return permissionId;
    }

    async function revokeAndDeletePermission(permissionId: string, userName: string) {
      const input: RevokedInput = {
        permissionId: permissionId,
        userName: userName,
      };

      const resultAsync = revoked(logger, config)(input);
      const result = await resultAsync;
      expect(result.isSuccess).toBe(true);

      const input2: DeletePermissionInput = {
        permissionId: permissionId,
      };
      const resultAsync2 = deletePermission(logger, config)(input2);
      const result2 = await resultAsync2;
      if (result2.isErr()) {
        throw result2.error;
      }
    }

    beforeAll(async () => {
      const input1: CreatePermissionInput = {
        name: "approval workflow unit test1",
        description: "Unit-test-1",
        awsAccountId: targetAwsAccountId,
        permissionSetNameId: "Unit-test1",
        managedIamPolicyNames: ["ReadOnlyAccess"],
        customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
        sessionDuration: "PT12H",
      };
      permissionId1 = await createAndApprovePermission(input1, userName);

      const input2: CreatePermissionInput = {
        name: "approval workflow unit test2",
        description: "Unit-test2",
        awsAccountId: targetAwsAccountId,
        permissionSetNameId: "Unit-test2",
        managedIamPolicyNames: ["ReadOnlyAccess"],
        customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
        sessionDuration: "PT12H",
      };
      permissionId2 = await createAndApprovePermission(input2, userName);
    });

    it("normal case of listAuditItem", async () => {
      const input = {
        accountId: targetAwsAccountId,
      };
      const resultAsync = listAuditItem(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const listAuditItems = result.value;
      expect(listAuditItems.items.length).not.toBe(0);
    });

    it("Testing successful pagination in listAuditItem", async () => {
      const input1 = {
        accountId: targetAwsAccountId,
        nextToken: undefined,
        limit: 1,
      };
      const resultAsync1 = listAuditItem(logger, config)(input1);
      const result1 = await resultAsync1;
      if (result1.isErr()) {
        throw result1.error;
      }
      const listAuditItems1 = result1.value;
      expect(listAuditItems1.items.length).toBe(1);
      expect(listAuditItems1.nextToken).not.toBe(undefined);

      const input2 = {
        accountId: targetAwsAccountId,
        nextToken: listAuditItems1.nextToken,
        limit: 1,
      };
      const resultAsync2 = listAuditItem(logger, config)(input2);
      const result2 = await resultAsync2;
      if (result2.isErr()) {
        throw result2.error;
      }
      const listAuditItems2 = result2.value;
      expect(listAuditItems2.items.length).toBe(1);
      expect(listAuditItems2.nextToken).not.toBe(undefined);

      const input3 = {
        accountId: targetAwsAccountId,
        nextToken: listAuditItems2.nextToken,
        limit: 1,
      };
      const resultAsync3 = listAuditItem(logger, config)(input3);
      const result3 = await resultAsync3;
      if (result3.isErr()) {
        throw result3.error;
      }
      const listAuditItems3 = result3.value;
      expect(listAuditItems3.items.length).toBe(0);
      expect(listAuditItems3.nextToken).toBe(undefined);
    });

    afterAll(async () => {
      if (permissionId1) {
        await revokeAndDeletePermission(permissionId1, userName);
        permissionId1 = null;
      }
      if (permissionId2) {
        await revokeAndDeletePermission(permissionId2, userName);
        permissionId2 = null;
      }
    });
  },
  { timeout: 100000 }
);
