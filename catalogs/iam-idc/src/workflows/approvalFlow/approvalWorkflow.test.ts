import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { approved, ApprovedInput } from "./approved";
import { revoked, RevokedInput } from "./revoked";
import { validateApprovalRequest, ValidateApprovalRequestInput } from "./approvalRequestValidation";
import { createPermission, CreatePermissionInput } from "../permission/createPermission";
import { deletePermission, DeletePermissionInput } from "../permission/deletePermission";
import { getPermission } from "../permission/getPermission";
import { createLogger } from "@stamp-lib/stamp-logger";
import { registerAwsAccount } from "../awsAccount/registerAwsAccount";
import { unregisterAwsAccount } from "../awsAccount/unregisterAwsAccount";

describe(
  "Testing the approval workflow",
  () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
    const userName: string = process.env.EXISTING_USER_NAME!;
    const config = {
      region: "us-west-2",
      identityInstanceArn: process.env.IDENTITY_INSTANCE_ARN!,
      identityStoreId: process.env.IDENTITY_STORE_ID!,
      permissionTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-Permission`,
      accountManagementTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`,
      permissionIdPrefix: "ST",
    };
    let permissionId: string | null = null;
    const targetAwsAccountId: string = process.env.TARGET_AWS_ACCOUNT_ID!;

    beforeAll(async () => {
      // Clean up existing permission if it exists
      const testPermissionId = `${config.permissionIdPrefix}-Unit-test-${targetAwsAccountId}`;
      const existingPermission = await getPermission(logger, config)({ permissionId: testPermissionId });
      if (existingPermission.isOk()) {
        console.log(`Cleaning up existing permission: ${testPermissionId}`);
        try {
          await deletePermission(logger, config)({ permissionId: testPermissionId });
        } catch (error) {
          console.warn(`Failed to cleanup permission ${testPermissionId}:`, error);
        }
      }

      const resultAsync = registerAwsAccount(
        logger,
        config
      )({
        accountId: targetAwsAccountId,
        name: "target AWS Account",
      });
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }

      const input: CreatePermissionInput = {
        name: "approval workflow unit test",
        description: "Unit-test",
        awsAccountId: targetAwsAccountId,
        permissionSetNameId: "Unit-test",
        managedIamPolicyNames: ["ReadOnlyAccess"],
        customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Accoun
        sessionDuration: "PT12H",
      };

      const resultAsync2 = createPermission(logger, config)(input);
      const result2 = await resultAsync2;
      if (result2.isErr()) {
        throw result2.error;
      }
      const permissionInfo = result2.value;
      permissionId = permissionInfo.permissionId;
      console.log("permissionId:", permissionId);
    });

    it("normal case of validateApprovalRequest", async () => {
      if (permissionId === null) throw new Error("permissionIds undefined.");
      const input: ValidateApprovalRequestInput = {
        permissionId: permissionId,
        userName: userName,
      };
      const resultAsync = validateApprovalRequest(logger, config)(input);
      const result = await resultAsync;
      console.log("result:", result);
      expect(result.isSuccess).toBe(true);
      expect(result.message).toContain(`This is a request for user ${userName} to access approval workflow unit test permission.`);
      expect(result.message).toContain(`AWS Account: target AWS Account (${targetAwsAccountId})`);
      expect(result.message).toContain(`IAM Policy Name: ReadOnlyAccess,Stamp-Unit-test-${targetAwsAccountId}`);
    });

    it("normal case of approved", async () => {
      if (permissionId === null) throw new Error("permissionIds undefined.");
      const input: ApprovedInput = {
        permissionId: permissionId,
        userName: userName,
      };

      const resultAsync = approved(logger, config)(input);
      const result = await resultAsync;
      expect(result.isSuccess).toBe(true);
    });

    it("Successful case where user and permissionSet have already been linked", async () => {
      if (permissionId === null) throw new Error("permissionIds undefined.");
      const input: ApprovedInput = {
        permissionId: permissionId,
        userName: userName,
      };

      const resultAsync = approved(logger, config)(input);
      const result = await resultAsync;
      expect(result.isSuccess).toBe(true);
    });

    it("normal case of revoked", async () => {
      if (permissionId === null) throw new Error("permissionIds undefined.");
      const input: RevokedInput = {
        permissionId: permissionId,
        userName: userName,
      };

      const resultAsync = revoked(logger, config)(input);
      const result = await resultAsync;
      expect(result.isSuccess).toBe(true);
    });

    it("Successful case where user and permissionSet have already been unlinked", async () => {
      if (permissionId === null) throw new Error("permissionIds undefined.");
      const input: RevokedInput = {
        permissionId: permissionId,
        userName: userName,
      };

      const resultAsync = revoked(logger, config)(input);
      const result = await resultAsync;
      console.log("result:", result);
      expect(result.isSuccess).toBe(true);
    });

    it("validateApprovalRequest should fail if PermissionId is not found", async () => {
      if (permissionId === null) throw new Error("permissionIds undefined.");
      const input: ValidateApprovalRequestInput = {
        permissionId: "non-existent-permission-id",
        userName: userName,
      };
      const resultAsync = validateApprovalRequest(logger, config)(input);
      const result = await resultAsync;
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Permission non-existent-permission-id is not found");
    });

    it("approved should fail if PermissionId is not found", async () => {
      if (permissionId === null) throw new Error("permissionIds undefined.");
      const input: ApprovedInput = {
        permissionId: "non-existent-permission-id",
        userName: userName,
      };

      const resultAsync = approved(logger, config)(input);
      const result = await resultAsync;
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Permission non-existent-permission-id is not found");
    });

    it("revoked should fail if PermissionId is not found", async () => {
      if (permissionId === null) throw new Error("permissionIds undefined.");
      const input: RevokedInput = {
        permissionId: "non-existent-permission-id",
        userName: userName,
      };

      const resultAsync = revoked(logger, config)(input);
      const result = await resultAsync;
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Permission non-existent-permission-id is not found");
    });

    afterAll(async () => {
      if (permissionId) {
        const input: DeletePermissionInput = {
          permissionId: permissionId,
        };
        const resultAsync = deletePermission(logger, config)(input);
        const result = await resultAsync;
        if (result.isErr()) {
          throw result.error;
        }
        permissionId = null;

        const resultAsync2 = unregisterAwsAccount(
          logger,
          config
        )({
          accountId: targetAwsAccountId,
        });
        const result2 = await resultAsync2;
        if (result2.isErr()) {
          throw result2.error;
        }
      }
    });
  },
  { timeout: 100000 }
);
