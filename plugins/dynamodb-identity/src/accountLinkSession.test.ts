import { expect, it, describe, afterAll } from "vitest";
import { StartAccountLinkSessionInput, GetAccountLinkSessionInput, DeleteAccountLinkSessionInput } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { some, none } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";
import { startImpl, getImpl, deleteImpl } from "./accountLinkSession";

const logger = createLogger("DEBUG", { moduleName: "plugins" });
const accountProviderName = "test-web-app";
let sessionKey = "";
const userId = "27e29081-eeb5-4cd1-95a9-6352a9269e1a"; // The uuid is meaningless and was generated for testing.
const tableName = `${process.env.DYNAMO_TABLE_PREFIX}-dynamodb-identity-AccountLinkSession`;
const config = { region: "us-west-2" };

describe("Testing accountLinkSession", () => {
  afterAll(async () => {
    await deleteImpl(logger)({ sessionKey: sessionKey }, tableName, config);
  });

  describe("startImpl", () => {
    it("should successfully set account link session with valid input", async () => {
      const input: StartAccountLinkSessionInput = {
        accountProviderName: accountProviderName,
        userId: userId,
      };
      const expected = {
        sessionKey: expect.any(String),
        accountProviderName: accountProviderName,
        userId: userId,
        createdAt: expect.any(String),
      };
      const resultAsync = startImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
      sessionKey = result.value.sessionKey;
    });
  });

  describe("getImpl", () => {
    it("should successfully get account link session with valid input", async () => {
      const input: GetAccountLinkSessionInput = {
        sessionKey: sessionKey,
      };
      const expected = {
        sessionKey: sessionKey,
        accountProviderName: accountProviderName,
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

    it("returns none if session key does not exist", async () => {
      const input: GetAccountLinkSessionInput = {
        sessionKey: "non-exist-session-key",
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failure result if session key is empty", async () => {
      const input: GetAccountLinkSessionInput = {
        sessionKey: "",
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteImpl", () => {
    it("should successfully delete account link session with valid input", async () => {
      const input: DeleteAccountLinkSessionInput = {
        sessionKey: sessionKey,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if session key does not exist", async () => {
      const input: GetAccountLinkSessionInput = {
        sessionKey: "non-exist-session-key",
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if session key is empty", async () => {
      const input: GetAccountLinkSessionInput = {
        sessionKey: "",
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
