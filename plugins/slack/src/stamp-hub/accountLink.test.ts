import { describe, expect, it, vi } from "vitest";
import { some, none } from "@stamp-lib/stamp-option";
import { TRPCClientError } from "@trpc/client";
import { createLogger } from "@stamp-lib/stamp-logger";
import { getAccountLink, GetAccountLinkInput, AccountLink } from "./accountLink";

const logger = createLogger("DEBUG", { moduleName: "slack" });
const accountId = "test-slack-user";
const userId = "test-user-id";
const notificationPluginId = "slack";
// accountProviderName is the same as the notificationPluginConfig ID.
const accountProviderName = "slack";
const createdAt = "2024-01-02T03:04:05.006Z";

describe("Testing accountLink", () => {
  describe("getAccountLink", () => {
    it("should get account link with valid input", async () => {
      const getAccountLinkClient = {
        query: vi.fn().mockResolvedValue({
          accountProviderName: accountProviderName,
          accountId: accountId,
          userId: userId,
          createdAt: createdAt,
        }),
      };
      const input: GetAccountLinkInput = {
        slackUserId: accountId,
      };
      const expected: AccountLink = {
        accountProviderName: accountProviderName,
        accountId: accountId,
        userId: userId,
        createdAt: createdAt,
      };
      const result = await getAccountLink(logger, getAccountLinkClient, notificationPluginId)(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("should get account link with variant notificationPluginId", async () => {
      const getAccountLinkClient = {
        query: vi.fn().mockResolvedValue({
          accountProviderName: "slack-variant-workspace-id",
          accountId: accountId,
          userId: userId,
          createdAt: createdAt,
        }),
      };
      const input: GetAccountLinkInput = {
        slackUserId: accountId,
      };
      const expected: AccountLink = {
        accountProviderName: "slack-variant-workspace-id",
        accountId: accountId,
        userId: userId,
        createdAt: createdAt,
      };
      const result = await getAccountLink(logger, getAccountLinkClient, "slack-variant-workspace-id")(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if slack user ID does not exist", async () => {
      const getAccountLinkClient = {
        query: vi.fn().mockReturnValue(undefined),
      };
      const input: GetAccountLinkInput = {
        slackUserId: "non-existent-slack-user-id",
      };
      const result = await getAccountLink(logger, getAccountLinkClient, notificationPluginId)(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns client error if slack user id is empty", async () => {
      const getAccountLinkClient = {
        query: vi.fn().mockRejectedValue(new TRPCClientError("request failed")),
      };
      const input: GetAccountLinkInput = {
        slackUserId: "",
      };
      const result = await getAccountLink(logger, getAccountLinkClient, notificationPluginId)(input);
      if (result.isOk()) {
        throw result.value;
      }
      expect(result.error.message).toBe("request failed");
    });

    it("returns server error if getAccountLink returns error", async () => {
      const getAccountLinkClient = {
        query: vi.fn().mockRejectedValue(new Error("Server Error")),
      };
      const input: GetAccountLinkInput = {
        slackUserId: userId,
      };
      const result = await getAccountLink(logger, getAccountLinkClient, notificationPluginId)(input);
      if (result.isOk()) {
        throw result.value;
      }
      expect(result.error.message).toBe("Server Error");
    });
  });
});
