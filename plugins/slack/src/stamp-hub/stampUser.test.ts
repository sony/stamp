import { describe, expect, it, vi } from "vitest";
import { some, none } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";
import { User } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { getStampHubUser } from "./stampUser";

const logger = createLogger("DEBUG", { moduleName: "slack" });
const userId = "5c912a6a-196b-14f6-5b77-48eb07d8d5a9"; // uuid is meaningless and are generated for testing.
const userName = "test-user-name";
const createdAt = "2024-01-02T03:04:05.006Z";
const updatedAt = "2024-01-02T10:11:12.123Z";
const email = "test-email@example.com";

describe("Testing accountLink", () => {
  describe("getStampHubUser", () => {
    it("should get account link with valid input", async () => {
      const getStampHubUserClient = {
        query: vi.fn().mockResolvedValue({
          userId: userId,
          userName: userName,
          email: email,
          createdAt: createdAt,
          updatedAt: updatedAt,
        }),
      };
      const expected: User = {
        userId: userId,
        userName: userName,
        email: email,
        createdAt: createdAt,
        updatedAt: updatedAt,
      };
      const result = await getStampHubUser(logger, getStampHubUserClient)(userId);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if user ID does not exist", async () => {
      const getStampHubUserClient = {
        query: vi.fn().mockReturnValue(undefined),
      };
      const nonExistentId = "8c888a8a-888b-88f8-8b88-88eb88d8d8a8";
      const result = await getStampHubUser(logger, getStampHubUserClient)(nonExistentId);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns server error if getStampHubUser returns error", async () => {
      const getStampHubUserClient = {
        query: vi.fn().mockRejectedValue(new Error("Server Error")),
      };
      const result = await getStampHubUser(logger, getStampHubUserClient)(userId);
      if (result.isOk()) {
        throw result.value;
      }
      expect(result.error.message).toBe("Server Error");
    });
  });
});
