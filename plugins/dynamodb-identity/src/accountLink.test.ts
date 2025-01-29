import { expect, it, describe, beforeAll, afterAll } from "vitest";
import {
  GetAccountLinkInput,
  ListAccountLinkByUserIdInput,
  SetAccountLinkInput,
  DeleteAccountLinkInput,
  DeleteAllAccountLinkByUserIdInput,
} from "@stamp-lib/stamp-types/pluginInterface/identity";
import { some, none } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";
import { setImpl, getImpl, listByUserIdImpl, deleteImpl, deleteAllByUserIdImpl } from "./accountLink";

const logger = createLogger("DEBUG", { moduleName: "plugins" });
const accountProviderName = "test-web-app";
const accountId = "1234567890";
const userId = "27e29081-eeb5-4cd1-95a9-6352a9269e1a"; // The uuid is meaningless and was generated for testing.
const tableName = `${process.env.DYNAMO_TABLE_PREFIX}-dynamodb-identity-AccountLink`;
const config = { region: "us-west-2" };

const deleteAccountLinkForTest = async () => {
  const input = {
    accountProviderName: accountProviderName,
    accountId: accountId,
  };
  await deleteImpl(logger)(input, tableName, config);
};

describe("Testing accountLink", () => {
  beforeAll(async () => {
    await deleteAccountLinkForTest();
  });
  afterAll(async () => {
    await deleteAccountLinkForTest();
  });

  describe("setImpl", () => {
    it("should successfully set account link with valid input", async () => {
      const input: SetAccountLinkInput = {
        accountProviderName: accountProviderName,
        accountId: accountId,
        userId: userId,
      };
      const expected = {
        accountProviderName: accountProviderName,
        accountId: accountId,
        userId: userId,
        createdAt: expect.any(String),
      };
      const resultAsync = setImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each([
      [
        "account provider name is empty",
        {
          accountProviderName: "",
          accountId: accountId,
          userId: userId,
        },
      ],
      [
        "account ID is empty",
        {
          accountProviderName: accountProviderName,
          accountId: "",
          userId: userId,
        },
      ],
      [
        "user ID is empty",
        {
          accountProviderName: accountProviderName,
          accountId: accountId,
          userId: "",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = setImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getImpl", () => {
    it("should successfully get account link with valid input", async () => {
      const input: GetAccountLinkInput = {
        accountProviderName: accountProviderName,
        accountId: accountId,
      };
      const expected = {
        accountProviderName: accountProviderName,
        accountId: accountId,
        userId: userId,
        createdAt: expect.any(String),
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if account provider name does not exist", async () => {
      const input: GetAccountLinkInput = {
        accountProviderName: "non-existent-provider-name",
        accountId: accountId,
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns none if account ID does not exist", async () => {
      const input: GetAccountLinkInput = {
        accountProviderName: accountProviderName,
        accountId: "non-existent-account-id",
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it.each([
      [
        "account provider name is empty",
        {
          accountProviderName: "",
          accountId: accountId,
        },
      ],
      [
        "account ID is empty",
        {
          accountProviderName: accountProviderName,
          accountId: "",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listByUserIdImpl", () => {
    it("should successfully list account links with valid input", async () => {
      const input: ListAccountLinkByUserIdInput = {
        userId: userId,
      };
      const resultAsync = listByUserIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.length).not.toBe(0);
    });

    it("returns successful result even if user ID does not exist", async () => {
      const input: ListAccountLinkByUserIdInput = {
        userId: "non-existent-user-id",
      };
      const resultAsync = listByUserIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result even if user ID is empty", async () => {
      const input: ListAccountLinkByUserIdInput = {
        userId: "",
      };
      const resultAsync = listByUserIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteImpl", () => {
    it("should successfully delete account link with valid input", async () => {
      const input: DeleteAccountLinkInput = {
        accountProviderName: accountProviderName,
        accountId: accountId,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if account provider name does not exist", async () => {
      const input: DeleteAccountLinkInput = {
        accountProviderName: "non-existent-provider-name",
        accountId: accountId,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if account ID does not exist", async () => {
      const input: DeleteAccountLinkInput = {
        accountProviderName: accountProviderName,
        accountId: "non-existent-account-id",
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it.each([
      [
        "account provider name is empty",
        {
          accountProviderName: "",
          accountId: accountId,
        },
      ],
      [
        "account ID is empty",
        {
          accountProviderName: accountProviderName,
          accountId: "",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteAllByUserIdImpl", () => {
    it("should successfully delete all account links with valid input", async () => {
      const input: DeleteAllAccountLinkByUserIdInput = {
        userId: userId,
      };
      const resultAsync = deleteAllByUserIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if user ID does not exist", async () => {
      const input: DeleteAllAccountLinkByUserIdInput = {
        userId: "27e29081-eeb5-4cd1-95a9-123456789012",
      };
      const resultAsync = deleteAllByUserIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if user ID is empty", async () => {
      const input: DeleteAllAccountLinkByUserIdInput = {
        userId: "",
      };
      const resultAsync = deleteAllByUserIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
