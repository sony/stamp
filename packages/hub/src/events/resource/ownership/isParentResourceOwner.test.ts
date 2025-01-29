import { describe, expect, it, vi } from "vitest";
import { createIsParentResourceOwner } from "./isParentResourceOwner";
import { some, none } from "@stamp-lib/stamp-option";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { okAsync, errAsync } from "neverthrow";
import { StampHubError } from "../../../error";

const requestUserId = "93b64c99-1df7-02b2-cf09-07ce10991b8d"; // uuid is meaningless and was generated for testing.
const catalogId = "test-catalog-id";
const parentResourceId = "test-parent-resource-id";
const parentResourceTypeId = "test-parent-resource-type-id";

describe("createIsParentResourceOwner", () => {
  const getResourceDBProviderSuccess = vi.fn().mockReturnValue(
    okAsync(
      some({
        ownerGroupId: "b3ffd00c-0a4c-d0f3-fa12-65fff7bef14d",
      })
    )
  );
  const isUserInGroupSuccess = vi.fn().mockReturnValue(okAsync(true));

  it("checks parent resource owner", async () => {
    const isParentResourceOwner = createIsParentResourceOwner(getResourceDBProviderSuccess, isUserInGroupSuccess);
    const input = {
      requestUserId: requestUserId,
      resourceInfo: {
        catalogId: catalogId,
        parentResourceId: parentResourceId,
        parentResourceTypeId: parentResourceTypeId,
      },
    };

    const result = await isParentResourceOwner(input);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBe(true);
  });

  it("checks not parent resource owner if parent resource ID is undefined", async () => {
    const isParentResourceOwner = createIsParentResourceOwner(getResourceDBProviderSuccess, isUserInGroupSuccess);
    const input = {
      requestUserId: requestUserId,
      resourceInfo: {
        catalogId: catalogId,
        parentResourceId: undefined,
        parentResourceTypeId: parentResourceTypeId,
      },
    };

    const result = await isParentResourceOwner(input);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBe(false);
  });

  it("checks not parent resource owner if getResourceDBProvider returns none", async () => {
    const getResourceDBProviderNone = vi.fn().mockReturnValue(okAsync(none));
    const isParentResourceOwner = createIsParentResourceOwner(getResourceDBProviderNone, isUserInGroupSuccess);
    const input = {
      requestUserId: requestUserId,
      resourceInfo: {
        catalogId: catalogId,
        parentResourceId: parentResourceId,
        parentResourceTypeId: parentResourceTypeId,
      },
    };

    const result = await isParentResourceOwner(input);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBe(false);
  });

  it("checks not parent resource owner if return value of getResourceDBProvider does not have ownerGroupId", async () => {
    const getResourceDBProviderSuccess = vi.fn().mockReturnValue(okAsync(some({})));
    const isParentResourceOwner = createIsParentResourceOwner(getResourceDBProviderSuccess, isUserInGroupSuccess);
    const input = {
      requestUserId: requestUserId,
      resourceInfo: {
        catalogId: catalogId,
        parentResourceId: parentResourceId,
        parentResourceTypeId: parentResourceTypeId,
      },
    };

    const result = await isParentResourceOwner(input);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBe(false);
  });

  it.each([
    ["getResourceDBProvider returns error", vi.fn().mockReturnValue(errAsync(new DBError("This is DB Error", "INTERNAL_SERVER_ERROR"))), isUserInGroupSuccess],
    [
      "checkUserInGroup returns error",
      getResourceDBProviderSuccess,
      vi.fn().mockReturnValue(errAsync(new StampHubError("Unexpected error occurred", "Unexpected error occurred", "INTERNAL_SERVER_ERROR"))),
    ],
  ])("should return error", async (key, fn1, fn2) => {
    const isParentResourceOwner = createIsParentResourceOwner(fn1, fn2);
    const input = {
      requestUserId: requestUserId,
      resourceInfo: {
        catalogId: catalogId,
        parentResourceId: parentResourceId,
        parentResourceTypeId: parentResourceTypeId,
      },
    };
    const result = await isParentResourceOwner(input);
    expect(result.isErr()).toBe(true);
  });
});
