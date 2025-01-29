import { describe, expect, it, vi } from "vitest";
import { createIsResourceOwner } from "./isResourceOwner";
import { okAsync, errAsync } from "neverthrow";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";

const requestUserId = "93b64c99-1df7-02b2-cf09-07ce10991b8d"; // uuid is meaningless and was generated for testing.
const resourceId = "test-resource-id";
const name = "test-name";
const catalogId = "test-catalog-id";
const resourceTypeId = "test-resource-type-id";
const ownerGroupId = "7fd8769d-7fa5-2d5b-e339-f7c8e0d1bdc0"; // uuid is meaningless and was generated for testing.

describe("createIsResourceOwner", () => {
  it("checks resource owner", async () => {
    const isUserInGroup = vi.fn().mockReturnValue(okAsync(true));
    const isResourceOwner = createIsResourceOwner(isUserInGroup);
    const input = {
      requestUserId: requestUserId,
      resourceInfo: {
        params: {},
        id: resourceId,
        name: name,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        ownerGroupId: ownerGroupId,
      },
    };

    const result = await isResourceOwner(input);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBe(true);
  });

  it("checks not resource owner if owner group ID is undefined", async () => {
    const isUserInGroup = vi.fn().mockReturnValue(okAsync(true));
    const isResourceOwner = createIsResourceOwner(isUserInGroup);
    const input = {
      requestUserId: requestUserId,
      resourceInfo: {
        params: {},
        id: resourceId,
        name: name,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        ownerGroupId: undefined,
      },
    };

    const result = await isResourceOwner(input);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBe(false);
  });

  it("should return error if checkUserInGroup returns error", async () => {
    const isUserInGroupError = vi.fn().mockReturnValue(errAsync(new HandlerError("failed to check user", "INTERNAL_SERVER_ERROR")));
    const isResourceOwner = createIsResourceOwner(isUserInGroupError);
    const input = {
      requestUserId: requestUserId,
      resourceInfo: {
        params: {},
        id: resourceId,
        name: name,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        ownerGroupId: ownerGroupId,
      },
    };

    const result = await isResourceOwner(input);

    expect(result.isErr()).toBe(true);
  });
});
