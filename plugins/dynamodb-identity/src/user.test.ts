import { expect, it, describe, afterAll } from "vitest";
import { CreateUserInput, DeleteUserInput, GetUserInput, ListUserInput, UpdateUserInput } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { some, none } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";
import { createImpl, getImpl, listImpl, updateImpl, deleteImpl } from "./user";

const logger = createLogger("DEBUG", { moduleName: "plugins" });
const userName = "test-user-name";
const email = "test_user_@example.com";
let userId = "";
const tableName = `${process.env.DYNAMO_TABLE_PREFIX}-dynamodb-identity-User`;
const config = { region: "us-west-2" };

describe("Testing user", () => {
  afterAll(async () => {
    await deleteImpl(logger)({ userId: userId }, tableName, config);
  });

  describe("createImpl", () => {
    it("should successfully create user with valid input", async () => {
      const input: CreateUserInput = {
        userName: userName,
        email: email,
      };
      const expected = {
        userId: expect.any(String),
        userName: userName,
        email: email,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      };
      const resultAsync = createImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
      userId = result.value.userId;
    });
  });

  describe("getImpl", () => {
    it("should successfully get user with valid input", async () => {
      const input: GetUserInput = {
        userId: userId,
      };
      const expected = {
        userId: userId,
        userName: userName,
        email: email,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if user ID does not exist", async () => {
      const input: GetUserInput = {
        userId: "non-existent-user-id",
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failure result", async () => {
      const input: GetUserInput = {
        userId: "",
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listImpl", () => {
    it("should successfully list users with valid input", async () => {
      const input: ListUserInput = {
        limit: undefined,
        paginationToken: undefined,
      };
      const resultAsync = listImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.users.length).not.toBe(0);
    });
  });

  describe("updateImpl", () => {
    it("should successfully update user with valid input", async () => {
      const input: UpdateUserInput = {
        userId: userId,
        userName: "test-updated-user-name",
        email: "test_updated_email@example.com",
      };
      const expected = {
        userId: userId,
        userName: "test-updated-user-name",
        email: "test_updated_email@example.com",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      };
      const resultAsync = updateImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each([
      [
        "user ID does not exist",
        {
          userId: "non-existent-user-id",
          userName: "test-updated-user-name",
          email: "test_updated_email@example.com",
        },
      ],
      [
        "user ID is empty",
        {
          userId: "",
          userName: "test-updated-user-name",
          email: "test_updated_email@example.com",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = updateImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteImpl", () => {
    it("should successfully delete user with valid input", async () => {
      const input: DeleteUserInput = {
        userId: userId,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if user ID does not exist", async () => {
      const input: DeleteUserInput = {
        userId: "non-existent-user-id",
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if user ID is empty", async () => {
      const input: DeleteUserInput = {
        userId: "",
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
