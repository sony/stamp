import { expect, it, describe, beforeAll, afterAll } from "vitest";
import {
  createTargetIamRoleDBItem,
  getTargetIamRoleDBItem,
  listTargetIamRoleDBItem,
  listTargetIamRoleDBItemByAccountId,
  deleteTargetIamRoleDBItem,
  GetTargetIamRoleDBItemInput,
  ListTargetIamRoleDBItemInput,
  ListTargetIamRoleDBItemByAccountIdInput,
  DeleteTargetIamRoleDBItemInput,
} from "./targetIamRoleDB";
import { TargetIamRole } from "../../types/targetIamRole";
import { none, some } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";

const accountId = "123456789012";
const iamRoleName = "stamp-test-role";
const id = "123456789012#stamp-test-role";
const createdAt = "2024-01-02T03:04:05.006Z";
const iamRoleAccountId = process.env.AWS_ACCOUNT_ID!;
const assumeRolePolicyArn = `arn:aws:iam::${iamRoleAccountId}:role/stamp-assume-role-unit-test`;
const tableName = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-TargetRoleResource`;
const config = { region: "us-west-2" };

describe("Testing TargetIamRoleDB", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeAll(async () => {
    const input: DeleteTargetIamRoleDBItemInput = {
      id: id,
    };
    await deleteTargetIamRoleDBItem(logger, tableName, config)(input);
  });

  afterAll(async () => {
    const input: DeleteTargetIamRoleDBItemInput = {
      id: id,
    };
    await deleteTargetIamRoleDBItem(logger, tableName, config)(input);
  });

  describe("createTargetIamRoleDBItem", () => {
    it("returns failed result if account ID is invalid", async () => {
      const input: TargetIamRole = {
        accountId: "",
        iamRoleName: iamRoleName,
        id: id,
        createdAt: createdAt,
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = createTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role name is invalid", async () => {
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: "",
        id: id,
        createdAt: createdAt,
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = createTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns successful result even if ID is empty", async () => {
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: "",
        createdAt: createdAt,
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = createTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if created date is invalid", async () => {
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: id,
        createdAt: "",
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = createTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns successful result even if assume role policy arn is empty", async () => {
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: id,
        createdAt: createdAt,
        assumeRolePolicyArn: "",
      };
      const resultAsync = createTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("creates target iam role DB item", async () => {
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: id,
        createdAt: createdAt,
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const expected = structuredClone(input);
      const resultAsync = createTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const TargetIamRole = result.value;
      expect(TargetIamRole).toEqual(expected);
    });
  });

  describe("getTargetIamRoleDBItem", () => {
    it("gets target iam role DB item", async () => {
      const input: GetTargetIamRoleDBItemInput = {
        id: id,
      };
      const expected: TargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: id,
        createdAt: createdAt,
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = getTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const TargetIamRole = result.value;
      expect(TargetIamRole).toEqual(some(expected));
    });

    it("returns none if ID does not exist", async () => {
      const input: GetTargetIamRoleDBItemInput = {
        id: "non#exist",
      };
      const resultAsync = getTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failed result if ID is invalid", async () => {
      const input: GetTargetIamRoleDBItemInput = {
        id: "",
      };
      const resultAsync = getTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listTargetIamRoleDBItem", () => {
    it("lists target iam role DB items", async () => {
      const input: ListTargetIamRoleDBItemInput = {};
      const resultAsync = listTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const TargetIamRoles = result.value;
      expect(TargetIamRoles.items.length).not.toBe(0);
    });
  });

  describe("listTargetIamRoleDBItemByAccountId", () => {
    it("lists target iam role DB items by account ID", async () => {
      const input: ListTargetIamRoleDBItemByAccountIdInput = {
        accountId: accountId,
      };
      const resultAsync = listTargetIamRoleDBItemByAccountId(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const TargetIamRoles = result.value;
      expect(TargetIamRoles.items.length).not.toBe(0);
    });

    it("returns successful result even if ID does not exist", async () => {
      const input: ListTargetIamRoleDBItemByAccountIdInput = {
        accountId: "111122223333",
      };
      const resultAsync = listTargetIamRoleDBItemByAccountId(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk() && result.value.items.length).toBe(0);
    });

    it("returns failed result if account ID is invalid", async () => {
      const input: ListTargetIamRoleDBItemByAccountIdInput = {
        accountId: "",
      };
      const resultAsync = listTargetIamRoleDBItemByAccountId(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteTargetIamRoleDBItem", () => {
    it("deletes target iam role DB item", async () => {
      const input: DeleteTargetIamRoleDBItemInput = {
        id: id,
      };
      const resultAsync = deleteTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if ID does not exist", async () => {
      const input: DeleteTargetIamRoleDBItemInput = {
        id: "non#exist",
      };
      const resultAsync = deleteTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if ID is invalid", async () => {
      const input: DeleteTargetIamRoleDBItemInput = {
        id: "",
      };
      const resultAsync = deleteTargetIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
