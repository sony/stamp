import { none, some } from "@stamp-lib/stamp-option";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JumpIamRole } from "../../types/jumpIamRole";
import {
  DeleteJumpIamRoleDBItemInput,
  GetByJumpIamRoleNameInput,
  GetJumpIamRoleDBItemInput,
  JumpIamRoleName,
  ListJumpIamRoleDBItemInput,
  createJumpIamRoleDBItem,
  deleteJumpIamRoleDBItem,
  getByJumpIamRoleName,
  getJumpIamRoleDBItem,
  listJumpIamRoleDBItem,
} from "./jumpIamRoleDB";
import { createLogger } from "@stamp-lib/stamp-logger";

const tableName = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-JumpIamRoleResource`;
const config = { region: "us-west-2" };

describe("Testing jumpIamRoleDB", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeAll(async () => {
    const input: DeleteJumpIamRoleDBItemInput = {
      jumpIamRoleName: "jumpTestServiceRole",
    };
    await deleteJumpIamRoleDBItem(logger, tableName, config)(input);
  });

  afterAll(async () => {
    const input: DeleteJumpIamRoleDBItemInput = {
      jumpIamRoleName: "jumpTestServiceRole",
    };
    await deleteJumpIamRoleDBItem(logger, tableName, config)(input);
  });

  describe("createJumpIamRoleDBItem", () => {
    it("returns failed result if Jump iam role name is invalid", async () => {
      const input: JumpIamRole = {
        jumpIamRoleName: "",
        originIamRoleArn: "arn:aws:iam::012345678901:role/test-service-role",
        iamRoleName: "test-jump-jumpTestServiceRole",
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = createJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns successful result if origin iam role arn is invalid", async () => {
      const input: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: "",
        iamRoleName: "test-jump-jumpTestServiceRole",
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = createJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result even if iam role name is empty", async () => {
      const input: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: "arn:aws:iam::012345678901:role/test-service-role",
        iamRoleName: "",
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = createJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns successful result even if iam role arn is empty", async () => {
      const input: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: "arn:aws:iam::012345678901:role/test-service-role",
        iamRoleName: "test-jump-jumpTestServiceRole",
        iamRoleArn: "",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = createJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if creation date is invalid", async () => {
      const input: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: "arn:aws:iam::012345678901:role/test-service-role",
        iamRoleName: "test-jump-jumpTestServiceRole",
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        createdAt: "",
      };
      const resultAsync = createJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("creates Jump iam role DB item", async () => {
      const input: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: "arn:aws:iam::012345678901:role/test-service-role",
        iamRoleName: "test-jump-jumpTestServiceRole",
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const expected = structuredClone(input);
      const resultAsync = createJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const JumpIamRole = result.value;
      expect(JumpIamRole).toEqual(expected);
    });
  });

  describe("getJumpIamRoleDBItem", () => {
    it("gets Jump iam role DB item", async () => {
      const input: GetJumpIamRoleDBItemInput = {
        jumpIamRoleName: "jumpTestServiceRole",
      };
      const expected: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: "arn:aws:iam::012345678901:role/test-service-role",
        iamRoleArn: "arn:aws:iam::123456789012:role/test-service-role",
        iamRoleName: "test-jump-jumpTestServiceRole",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = getJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const JumpIamRole = result.value;
      expect(JumpIamRole).toEqual(some(expected));
    });

    it("returns none if Jump iam role name does not exist", async () => {
      const input: GetJumpIamRoleDBItemInput = {
        jumpIamRoleName: "jumpTestServiceRole-NotExist",
      };
      const resultAsync = getJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failed result if Jump iam role name is invalid", async () => {
      const input: GetJumpIamRoleDBItemInput = {
        jumpIamRoleName: "",
      };
      const resultAsync = getJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getByJumpIamRoleName", () => {
    it("gets Jump iam role DB item using GSI", async () => {
      const input: GetByJumpIamRoleNameInput = {
        iamRoleName: "test-jump-jumpTestServiceRole",
      };
      const expected: JumpIamRoleName = {
        jumpIamRoleName: "jumpTestServiceRole",
      };

      const resultAsync = getByJumpIamRoleName(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const resultJumpIamRoleName = result.value;
      expect(resultJumpIamRoleName).toEqual(some(expected));
    });

    it("returns none if iam role name does not exist", async () => {
      const input: GetByJumpIamRoleNameInput = {
        iamRoleName: "stamp-jump-jumpTestServiceRole-NotExist",
      };
      const resultAsync = getByJumpIamRoleName(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failed result if iam role name is invalid", async () => {
      const input: GetByJumpIamRoleNameInput = {
        iamRoleName: "",
      };
      const resultAsync = getByJumpIamRoleName(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listJumpIamRoleDBItem", () => {
    it("lists Jump iam role DB item", async () => {
      const input: ListJumpIamRoleDBItemInput = {};
      const resultAsync = listJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const resultJumpIamRoles = result.value;
      expect(resultJumpIamRoles.items.length).not.toBe(0);
    });
  });

  describe("deleteJumpIamRoleDBItem", () => {
    it("deletes Jump iam role DB item", async () => {
      const input: DeleteJumpIamRoleDBItemInput = {
        jumpIamRoleName: "jumpTestServiceRole",
      };
      const resultAsync = deleteJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if Jump iam role name does not exist", async () => {
      const input: DeleteJumpIamRoleDBItemInput = {
        jumpIamRoleName: "jumpTestServiceRole-NotExist",
      };
      const resultAsync = deleteJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if Jump iam role name is invalid", async () => {
      const input: DeleteJumpIamRoleDBItemInput = {
        jumpIamRoleName: "",
      };
      const resultAsync = deleteJumpIamRoleDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
