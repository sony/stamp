import { expect, it, describe, beforeAll, afterAll } from "vitest";
import {
  CountGroupMemberShipInput,
  CreateGroupMemberShipInput,
  DeleteGroupMemberShipInput,
  GetGroupMemberShipInput,
  GroupMemberShipRole,
  ListGroupMemberShipByGroupInput,
  ListGroupMemberShipByUserInput,
  UpdateGroupMemberShipInput,
} from "@stamp-lib/stamp-types/pluginInterface/identity";
import { some, none } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";
import { createImpl, getImpl, listByGroupImpl, listByUserImpl, countImpl, updateImpl, deleteImpl } from "./groupMemberShip";

const logger = createLogger("DEBUG", { moduleName: "plugins" });
const groupId = "56a02254-eeb5-4cd1-95a9-6352a9269a2c"; // The uuid is meaningless and was generated for testing.
const userId = "27e29081-eeb5-4cd1-95a9-6352a9269e1b"; // The uuid is meaningless and was generated for testing.
const role = GroupMemberShipRole.Enum.member;
const tableName = `${process.env.DYNAMO_TABLE_PREFIX}-dynamodb-identity-GroupMemberShip`;
const config = { region: "us-west-2" };

const deleteGroupMemberShipForTest = async () => {
  const input = {
    userId: userId,
    groupId: groupId,
  };
  await deleteImpl(logger)(input, tableName, config);
};

describe("Testing groupMemberShip", () => {
  beforeAll(async () => {
    await deleteGroupMemberShipForTest();
  });
  afterAll(async () => {
    await deleteGroupMemberShipForTest();
  });

  describe("createImpl", () => {
    it("should successfully create group member ship with valid input", async () => {
      const input: CreateGroupMemberShipInput = {
        userId: userId,
        groupId: groupId,
        role: role,
      };
      const expected = {
        userId: userId,
        groupId: groupId,
        role: role,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      };
      const resultAsync = createImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each<CreateGroupMemberShipInput[]>([
      [
        {
          groupId: "",
          userId: userId,
          role: role,
        },
      ],
      [
        {
          groupId: groupId,
          userId: "",
          role: role,
        },
      ],
    ])("returns failure result", async (input) => {
      const resultAsync = createImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getImpl", () => {
    it("should successfully get group member ship with valid input", async () => {
      const input: GetGroupMemberShipInput = {
        userId: userId,
        groupId: groupId,
      };
      const expected = {
        userId: userId,
        groupId: groupId,
        role: role,
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

    it("returns none if group ID does not exist", async () => {
      const input: GetGroupMemberShipInput = {
        userId: userId,
        groupId: "non-existent-group-id",
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns none if user ID does not exist", async () => {
      const input: GetGroupMemberShipInput = {
        userId: "non-existent-user-id",
        groupId: groupId,
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
        "user ID is empty",
        {
          userId: "",
          groupId: groupId,
        },
      ],
      [
        "group ID is empty",
        {
          userId: userId,
          groupId: "",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listByGroupImpl", () => {
    it("should successfully list group member ships with valid input", async () => {
      const input: ListGroupMemberShipByGroupInput = {
        groupId: groupId,
      };
      const resultAsync = listByGroupImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.items.length).not.toBe(0);
    });

    it("returns successful result if group ID does not exist", async () => {
      const input: ListGroupMemberShipByGroupInput = {
        groupId: "non-existent-group-id",
      };
      const resultAsync = listByGroupImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if group ID is empty", async () => {
      const input: ListGroupMemberShipByGroupInput = {
        groupId: "",
      };
      const resultAsync = listByGroupImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listByUserImpl", () => {
    it("should successfully list group member ships with valid input", async () => {
      const input: ListGroupMemberShipByUserInput = {
        userId: userId,
      };
      const resultAsync = listByUserImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.items.length).not.toBe(0);
    });

    it("returns successful result if user ID does not exist", async () => {
      const input: ListGroupMemberShipByUserInput = {
        userId: "non-existent-user-id",
      };
      const resultAsync = listByUserImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if user ID is empty", async () => {
      const input: ListGroupMemberShipByUserInput = {
        userId: "",
      };
      const resultAsync = listByUserImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("countImpl", () => {
    it("should successfully count group member ships with valid input", async () => {
      const input: CountGroupMemberShipInput = {
        groupId: groupId,
      };
      const resultAsync = countImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).not.toBe(0);
    });

    it("returns successful result if group ID does not exist", async () => {
      const input: CountGroupMemberShipInput = {
        groupId: "non-existent-group-id",
      };
      const resultAsync = listByGroupImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if group ID is empty", async () => {
      const input: CountGroupMemberShipInput = {
        groupId: "",
      };
      const resultAsync = listByGroupImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("updateImpl", () => {
    it("should successfully update group with valid input", async () => {
      const input: UpdateGroupMemberShipInput = {
        groupId: groupId,
        userId: userId,
        role: "owner",
      };
      const expected = {
        userId: userId,
        groupId: groupId,
        role: "owner",
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

    it.each<UpdateGroupMemberShipInput[]>([
      [
        {
          groupId: "non-existent-group-id",
          userId: userId,
          role: "owner",
        },
      ],
      [
        {
          groupId: groupId,
          userId: "non-existent-user-id",
          role: "owner",
        },
      ],
      [
        {
          groupId: "",
          userId: userId,
          role: "owner",
        },
      ],
      [
        {
          groupId: groupId,
          userId: "",
          role: "owner",
        },
      ],
    ])("returns failure result", async (input) => {
      const resultAsync = updateImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteImpl", () => {
    it("should successfully delete group member ship with valid input", async () => {
      const input: DeleteGroupMemberShipInput = {
        userId: userId,
        groupId: groupId,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if user ID does not exist", async () => {
      const input: DeleteGroupMemberShipInput = {
        userId: "non-existent-user-id",
        groupId: groupId,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if group ID does not exist", async () => {
      const input: DeleteGroupMemberShipInput = {
        userId: userId,
        groupId: "non-existent-group-id",
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it.each([
      [
        "user ID is empty",
        {
          userId: "",
          groupId: groupId,
        },
      ],
      [
        "group ID is empty",
        {
          userId: userId,
          groupId: "",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
