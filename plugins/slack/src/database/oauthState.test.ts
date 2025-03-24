import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { some, none } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";
import { OauthState, setOauthState, getOauthState, deleteOauthState, SetOauthStateInput, GetOauthStateInput, DeleteOauthStateInput } from "./oauthState";

const logger = createLogger("DEBUG", { moduleName: "slack" });
const config = { region: "us-west-2" };
const tableName = `${process.env.TABLE_NAME_PREFIX}-slack-OauthState`;
const state = "b774a48f-574e-9c95-5114-b6b48a5a550a"; // The uuid is meaningless and was generated for testing.
const sessionKey = "test-session-key";
const stampUserId = "de974bda-7148-c470-b428-af2b43cb67ad"; // The uuid is meaningless and was generated for testing.
const expirationTime = 100;

describe("Testing oauthState", () => {
  beforeAll(async () => {
    const input: DeleteOauthStateInput = {
      state: state,
    };
    await deleteOauthState(logger, tableName, config)(input);
  });

  afterAll(async () => {
    const input: DeleteOauthStateInput = {
      state: state,
    };
    await deleteOauthState(logger, tableName, config)(input);
  });

  describe("setOauthState", () => {
    it("returns successful result even if session key is empty", async () => {
      const input: SetOauthStateInput = {
        state: state,
        sessionKey: "",
        stampUserId: stampUserId,
        expirationTime: expirationTime,
        pluginId: "slack",
      };
      const resultAsync = setOauthState(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("should set oauth state with valid input", async () => {
      const input: SetOauthStateInput = {
        state: state,
        sessionKey: sessionKey,
        stampUserId: stampUserId,
        expirationTime: expirationTime,
        pluginId: "slack",
      };
      const expected = structuredClone(input);
      const resultAsync = setOauthState(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each([
      [
        "stamp user ID is empty",
        {
          state: state,
          sessionKey: sessionKey,
          stampUserId: "",
          expirationTime: expirationTime,
          pluginId: "slack",
        },
      ],
      [
        "state is empty",
        {
          state: "",
          sessionKey: sessionKey,
          stampUserId: stampUserId,
          expirationTime: expirationTime,
          pluginId: "slack",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = setOauthState(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getOauthState", () => {
    it("should get oauth state with valid input", async () => {
      const input: GetOauthStateInput = {
        state: state,
      };
      const expected: OauthState = {
        state: state,
        sessionKey: sessionKey,
        stampUserId: stampUserId,
        expirationTime: expirationTime,
        pluginId: "slack",
      };
      const resultAsync = getOauthState(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if state does not exist", async () => {
      const input: GetOauthStateInput = {
        state: "88bc8f88-e7e6-48e1-a084-8888a88c8e88",
      };
      const resultAsync = getOauthState(logger, tableName, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failure result if state is empty", async () => {
      const input: GetOauthStateInput = {
        state: "",
      };
      const resultAsync = getOauthState(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteOauthState", () => {
    it("should delete oauth state with valid input", async () => {
      const input: DeleteOauthStateInput = {
        state: state,
      };
      const resultAsync = deleteOauthState(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result if state does not exist", async () => {
      const input: DeleteOauthStateInput = {
        state: "88bc8f88-e7e6-48e1-a084-8888a88c8e88",
      };
      const resultAsync = deleteOauthState(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if state is empty", async () => {
      const input: DeleteOauthStateInput = {
        state: "",
      };
      const resultAsync = deleteOauthState(logger, tableName, config)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
