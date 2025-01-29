import { describe, expect, it, vi } from "vitest";
import { createIsCatalogOwner } from "./isCatalogOwner";
import { some, none } from "@stamp-lib/stamp-option";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { okAsync, errAsync } from "neverthrow";
import { StampHubError } from "../../../error";

const requestUserId = "771431ff-c832-898f-5891-dcbffe39c910"; // uuid is meaningless and was generated for testing.
const catalogId = "test-catalog-id";

describe("createIsCatalogOwner", () => {
  const getCatalogDBSuccess = vi.fn().mockReturnValue(
    okAsync(
      some({
        ownerGroupId: "dabec58f-bcdb-877e-f125-6fe6e2a83bc9",
      })
    )
  );
  const isUserInGroupSuccess = vi.fn().mockReturnValue(okAsync(true));

  it("checks catalog owner", async () => {
    const isCatalogOwner = createIsCatalogOwner(getCatalogDBSuccess, isUserInGroupSuccess);
    const input = {
      requestUserId: requestUserId,
      catalogId: catalogId,
    };

    const result = await isCatalogOwner(input);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBe(true);
  });

  it("checks not catalog owner if return value of getCatalogDB does not Some", async () => {
    const getCatalogDBDoesNotSome = vi.fn().mockReturnValue(okAsync(none));
    const isCatalogOwner = createIsCatalogOwner(getCatalogDBDoesNotSome, isUserInGroupSuccess);
    const input = {
      requestUserId: requestUserId,
      catalogId: catalogId,
    };

    const result = await isCatalogOwner(input);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBe(false);
  });

  it("checks not catalog owner if return value of getCatalogDB does not have ownerGroupId", async () => {
    const getCatalogDBNone = vi.fn().mockReturnValue(okAsync(some({})));
    const isCatalogOwner = createIsCatalogOwner(getCatalogDBNone, isUserInGroupSuccess);
    const input = {
      requestUserId: requestUserId,
      catalogId: catalogId,
    };

    const result = await isCatalogOwner(input);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBe(false);
  });

  it.each([
    ["getCatalogDB returns error", vi.fn().mockReturnValue(errAsync(new DBError("This is DB Error", "INTERNAL_SERVER_ERROR"))), isUserInGroupSuccess],
    [
      "checkUserInGroup returns error",
      getCatalogDBSuccess,
      vi.fn().mockReturnValue(errAsync(new StampHubError("Unexpected error occurred", "Unexpected error occurred", "INTERNAL_SERVER_ERROR"))),
    ],
  ])("should return error", async (key, fn1, fn2) => {
    const isCatalogOwner = createIsCatalogOwner(fn1, fn2);

    const input = {
      requestUserId: requestUserId,
      catalogId: catalogId,
    };

    const result = await isCatalogOwner(input);

    expect(result.isErr()).toBe(true);
  });
});
