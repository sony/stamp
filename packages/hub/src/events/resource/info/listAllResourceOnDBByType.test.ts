import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { createListAllResourceOnDBByType } from "./listAllResourceOnDBByType";

const catalogId = "test-catalog-id";
const resourceTypeId = "test-resource-type-id";
const row = (id: string) => ({ id, catalogId, resourceTypeId, visibility: "restricted" as const });

describe("createListAllResourceOnDBByType", () => {
  it("collects a single page into a Map keyed by id", async () => {
    const listByResourceType = vi.fn().mockReturnValue(okAsync({ items: [row("a"), row("b")] }));
    const result = await createListAllResourceOnDBByType(listByResourceType)({ catalogId, resourceTypeId });
    const map = result._unsafeUnwrap();
    expect(Array.from(map.keys())).toEqual(["a", "b"]);
    expect(map.get("a")?.visibility).toBe("restricted");
    expect(listByResourceType).toHaveBeenCalledTimes(1);
    expect(listByResourceType).toHaveBeenCalledWith({ catalogId, resourceTypeId, limit: 200, paginationToken: undefined });
  });

  it("follows paginationToken until exhausted", async () => {
    const listByResourceType = vi
      .fn()
      .mockReturnValueOnce(okAsync({ items: [row("a")], paginationToken: "t1" }))
      .mockReturnValueOnce(okAsync({ items: [row("b")], paginationToken: "t2" }))
      .mockReturnValueOnce(okAsync({ items: [row("c")] }));
    const result = await createListAllResourceOnDBByType(listByResourceType)({ catalogId, resourceTypeId });
    expect(Array.from(result._unsafeUnwrap().keys())).toEqual(["a", "b", "c"]);
    expect(listByResourceType).toHaveBeenCalledTimes(3);
    expect(listByResourceType.mock.calls[1][0].paginationToken).toBe("t1");
    expect(listByResourceType.mock.calls[2][0].paginationToken).toBe("t2");
  });

  it("propagates DB errors", async () => {
    const listByResourceType = vi.fn().mockReturnValue(errAsync(new DBError("DB error")));
    const result = await createListAllResourceOnDBByType(listByResourceType)({ catalogId, resourceTypeId });
    expect(result.isErr()).toBe(true);
  });

  it("fails instead of looping forever when the token never clears", async () => {
    const listByResourceType = vi.fn().mockReturnValue(okAsync({ items: [], paginationToken: "again" }));
    const result = await createListAllResourceOnDBByType(listByResourceType)({ catalogId, resourceTypeId });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("INTERNAL_SERVER_ERROR");
  });
});
