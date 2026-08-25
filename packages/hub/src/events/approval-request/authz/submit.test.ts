import { none, some } from "@stamp-lib/stamp-option";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { checkCanSubmitRequestForResources, createFindResourceNotRequestableBy } from "./submit";

const userId = "47f29c51-204c-09f6-2069-f3df073568c7";
const groupA = "1f10d463-a2fe-c407-2b95-05b561346c8b";
const groupB = "7c2b9e4d-1a3f-4c5e-9b8a-6d5c4b3a2f1e";
const ownerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd";
const catalogId = "test-catalog-id";

const rows: Record<string, { requesterGroupIds?: Array<string>; ownerGroupId?: string; visibility?: "all" | "restricted" }> = {
  open: {},
  emptyList: { requesterGroupIds: [] },
  restrictedA: { requesterGroupIds: [groupA], visibility: "restricted" },
  restrictedAB: { requesterGroupIds: [groupA, groupB] },
  ownedNotRequestable: { requesterGroupIds: [groupA], ownerGroupId },
};
const getResourceById = vi.fn(({ id }: { id: string }) => okAsync(id in rows ? some({ id, catalogId, resourceTypeId: "t", ...rows[id] }) : none));
const memberOf = (groups: Array<string>) => vi.fn(({ groupId }: { groupId: string }) => okAsync(groups.includes(groupId) ? some({}) : none));

const input = (ids: Array<string>) => ({
  catalogId,
  approvalFlowId: "flow",
  requestUserId: userId,
  inputResources: ids.map((resourceId) => ({ resourceTypeId: "t", resourceId })),
});

describe("checkCanSubmitRequestForResources", () => {
  it("passes when inputResources is empty without reading the DB", async () => {
    const getById = vi.fn();
    const result = await checkCanSubmitRequestForResources(getById, memberOf([]))(input([]));
    expect(result.isOk()).toBe(true);
    expect(getById).not.toHaveBeenCalled();
  });

  it("passes for resources without a DB row or without requesterGroupIds", async () => {
    const result = await checkCanSubmitRequestForResources(getResourceById, memberOf([]))(input(["no-row", "open", "emptyList"]));
    expect(result.isOk()).toBe(true);
  });

  it("passes when the user is a member of one of several requester groups (visibility is irrelevant)", async () => {
    const result = await checkCanSubmitRequestForResources(getResourceById, memberOf([groupB]))(input(["restrictedAB"]));
    expect(result.isOk()).toBe(true);
    const restricted = await checkCanSubmitRequestForResources(getResourceById, memberOf([groupA]))(input(["restrictedA"]));
    expect(restricted.isOk()).toBe(true);
  });

  it("returns the original input on success", async () => {
    const extra = { ...input(["open"]), somethingElse: 1 };
    const result = await checkCanSubmitRequestForResources(getResourceById, memberOf([]))(extra);
    expect(result._unsafeUnwrap()).toBe(extra);
  });

  it("returns FORBIDDEN naming the first non-requestable resource", async () => {
    const result = await checkCanSubmitRequestForResources(getResourceById, memberOf([groupB]))(input(["open", "restrictedA", "restrictedAB"]));
    const error = result._unsafeUnwrapErr();
    expect(error.code).toBe("FORBIDDEN");
    expect(error.systemMessage).toContain("t/restrictedA");
    expect(error.userMessage).toBe("You are not allowed to submit a request for this resource");
  });

  it("gives resource owners no bypass", async () => {
    const result = await checkCanSubmitRequestForResources(getResourceById, memberOf([ownerGroupId]))(input(["ownedNotRequestable"]));
    expect(result._unsafeUnwrapErr().code).toBe("FORBIDDEN");
  });

  it("converts DB errors", async () => {
    const failing = vi.fn().mockReturnValue(errAsync(new DBError("DB error")));
    const result = await checkCanSubmitRequestForResources(failing, memberOf([]))(input(["open"]));
    expect(result._unsafeUnwrapErr().code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("rejects malformed input", async () => {
    const result = await checkCanSubmitRequestForResources(getResourceById, memberOf([]))({ ...input(["open"]), requestUserId: "not-a-uuid" });
    expect(result._unsafeUnwrapErr().code).toBe("BAD_REQUEST");
  });
});

describe("createFindResourceNotRequestableBy", () => {
  it("returns none when every resource is requestable and some when one is not", async () => {
    const find = createFindResourceNotRequestableBy(getResourceById, memberOf([groupA]));
    const refs = ["open", "restrictedA"].map((resourceId) => ({ catalogId, resourceTypeId: "t", resourceId }));
    expect((await find(userId, refs))._unsafeUnwrap().isNone()).toBe(true);
    const notMember = createFindResourceNotRequestableBy(getResourceById, memberOf([]));
    const found = (await notMember(userId, refs))._unsafeUnwrap();
    expect(found.isSome() && found.value.resourceId).toBe("restrictedA");
  });
});
