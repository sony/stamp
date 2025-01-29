import { expect, it, describe, beforeAll, afterAll } from "vitest";
import {
  createAwsAccountDBItem,
  getAwsAccountDBItem,
  listAwsAccountDBItem,
  deleteAwsAccountDBItem,
  GetAwsAccountDBItemInput,
  ListAwsAccountDBItemInput,
  DeleteAwsAccountDBItemInput,
} from "./awsAccountDB";
import { AwsAccount } from "../../types/awsAccount";
import { none, some } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";

const accountId = "123456789012";
const accountName = "stamp-unit-test";
const tableName = `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-AWSAccountResource`;
const config = { region: "us-west-2" };

describe("Testing awsAccountDB", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeAll(async () => {
    const input: DeleteAwsAccountDBItemInput = {
      accountId: accountId,
    };
    await deleteAwsAccountDBItem(logger, tableName, config)(input);
  });

  afterAll(async () => {
    const input: DeleteAwsAccountDBItemInput = {
      accountId: accountId,
    };
    await deleteAwsAccountDBItem(logger, tableName, config)(input);
  });

  describe("createAwsAccountDBItem", () => {
    it("returns failed result if account ID is invalid", async () => {
      const input: AwsAccount = {
        accountId: "",
        name: accountName,
      };
      const resultAsync = createAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns successful result even if name is empty", async () => {
      const input: AwsAccount = {
        accountId: accountId,
        name: "",
      };
      const resultAsync = createAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);

      const deleteResult = await deleteAwsAccountDBItem(logger, tableName, config)(input);
      expect(deleteResult.isOk()).toBe(true);
    });

    it("creates AWS account DB item", async () => {
      const input: AwsAccount = {
        accountId: accountId,
        name: accountName,
      };
      const expected = structuredClone(input);
      const resultAsync = createAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const awsAccount = result.value;
      expect(awsAccount).toEqual(expected);
    });
  });

  describe("getAwsAccountDBItem", () => {
    it("gets AWS account DB item", async () => {
      const input: GetAwsAccountDBItemInput = {
        accountId: accountId,
      };
      const expected: AwsAccount = {
        accountId: accountId,
        name: accountName,
      };
      const resultAsync = getAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const awsAccount = result.value;
      expect(awsAccount).toEqual(some(expected));
    });

    it("returns none if account ID does not exist", async () => {
      const input: GetAwsAccountDBItemInput = {
        accountId: "111122223333",
      };
      const resultAsync = getAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failed result if account ID is invalid", async () => {
      const input: GetAwsAccountDBItemInput = {
        accountId: "",
      };
      const resultAsync = getAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listAwsAccountDBItem", () => {
    it("lists AWS account DB items", async () => {
      const input: ListAwsAccountDBItemInput = {};
      const resultAsync = listAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const awsAccounts = result.value;
      expect(awsAccounts.items.length).not.toBe(0);
    });
  });

  describe("deleteAwsAccountDBItem", () => {
    it("deletes AWS account DB item", async () => {
      const input: DeleteAwsAccountDBItemInput = {
        accountId: accountId,
      };
      const resultAsync = deleteAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if account ID does not exist", async () => {
      const input: DeleteAwsAccountDBItemInput = {
        accountId: "111122223333",
      };
      const resultAsync = deleteAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failed result if account ID is invalid", async () => {
      const input: DeleteAwsAccountDBItemInput = {
        accountId: "",
      };
      const resultAsync = deleteAwsAccountDBItem(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
