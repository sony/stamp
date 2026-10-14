import { some } from "@stamp-lib/stamp-option";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckCanViewApprovalRequest, createFilterVisibleApprovalRequests, isApprovalRequestVisibleTo } from "./canViewApprovalRequest";

const requester = "dbf33b00-8a5f-e045-4aa1-2d943cb659b6";
const viewerId = "47f29c51-204c-09f6-2069-f3df073568c7";
const approverGroupId = "18578bed-c45d-4f67-b9f7-10daf4c85f3f";
const catalogOwnerGroupId = "0a3d8d5b-7a3f-4b2e-9c1d-2f4e6a8b0c1d";
const viewerGroupId = "1f10d463-a2fe-c407-2b95-05b561346c8b";
const unrelatedGroupId = "7c2b9e4d-1a3f-4c5e-9b8a-6d5c4b3a2f1e";
const catalogId = "test-catalog-id";

const openRequest = { catalogId, requestUserId: requester, approverType: "group" as const, approverId: approverGroupId, visibility: undefined };
const restrictedRequest = { ...openRequest, visibility: { type: "restricted" as const, viewerGroupIds: [viewerGroupId] } };
const viewer = (groups: Array<string>, isCatalogOwner = false) => ({ userGroupIds: new Set(groups), isCatalogOwner });

describe("isApprovalRequestVisibleTo", () => {
  it("is visible to everyone without a snapshot", () => {
    expect(isApprovalRequestVisibleTo({ request: openRequest, requestUserId: viewerId, viewer: viewer([]) })).toBe(true);
  });
  it.each([
    ["the requester", requester, viewer([])],
    ["an approver group member", viewerId, viewer([approverGroupId])],
    ["the catalog owner", viewerId, viewer([], true)],
    ["a viewer group member", viewerId, viewer([viewerGroupId])],
  ])("restricted request is visible to %s", (_label, userId, v) => {
    expect(isApprovalRequestVisibleTo({ request: restrictedRequest, requestUserId: userId, viewer: v })).toBe(true);
  });
  it("restricted request is hidden from unrelated users", () => {
    expect(isApprovalRequestVisibleTo({ request: restrictedRequest, requestUserId: viewerId, viewer: viewer([unrelatedGroupId]) })).toBe(false);
  });
});

const membershipOf = (groups: Array<string>) =>
  vi.fn().mockReturnValue(okAsync({ items: groups.map((groupId) => ({ groupId, userId: viewerId, role: "member", createdAt: "", updatedAt: "" })) }));
const getCatalogDB = vi.fn().mockReturnValue(okAsync(some({ id: catalogId, ownerGroupId: catalogOwnerGroupId })));

describe("createCheckCanViewApprovalRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes requests without a snapshot, and the requester's own requests, without lookups", async () => {
    const listByUser = membershipOf([]);
    const check = createCheckCanViewApprovalRequest({ getCatalogDB, listGroupMemberShipByUser: listByUser });
    expect((await check({ request: openRequest, requestUserId: viewerId })).isOk()).toBe(true);
    expect((await check({ request: restrictedRequest, requestUserId: requester })).isOk()).toBe(true);
    expect(listByUser).not.toHaveBeenCalled();
    expect(getCatalogDB).not.toHaveBeenCalled();
  });

  it("passes approver / catalog owner / viewer group members and returns the request", async () => {
    for (const groups of [[approverGroupId], [catalogOwnerGroupId], [viewerGroupId]]) {
      const check = createCheckCanViewApprovalRequest({ getCatalogDB, listGroupMemberShipByUser: membershipOf(groups) });
      const result = await check({ request: restrictedRequest, requestUserId: viewerId });
      expect(result._unsafeUnwrap()).toBe(restrictedRequest);
    }
  });

  it("returns FORBIDDEN for unrelated users", async () => {
    const check = createCheckCanViewApprovalRequest({ getCatalogDB, listGroupMemberShipByUser: membershipOf([unrelatedGroupId]) });
    const result = await check({ request: restrictedRequest, requestUserId: viewerId });
    expect(result._unsafeUnwrapErr().code).toBe("FORBIDDEN");
  });
});

describe("createFilterVisibleApprovalRequests", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns everything without lookups when no request needs a check", async () => {
    const listByUser = membershipOf([]);
    const filter = createFilterVisibleApprovalRequests({ getCatalogDB, listGroupMemberShipByUser: listByUser });
    const own = { ...restrictedRequest };
    const result = await filter({ requests: [openRequest, own], requestUserId: requester, catalogId });
    expect(result._unsafeUnwrap()).toEqual([openRequest, own]);
    expect(listByUser).not.toHaveBeenCalled();
  });

  it("filters restricted requests for unrelated users with a single identity lookup", async () => {
    const listByUser = membershipOf([unrelatedGroupId]);
    const filter = createFilterVisibleApprovalRequests({ getCatalogDB, listGroupMemberShipByUser: listByUser });
    const result = await filter({ requests: [openRequest, restrictedRequest, restrictedRequest], requestUserId: viewerId, catalogId });
    expect(result._unsafeUnwrap()).toEqual([openRequest]);
    expect(listByUser).toHaveBeenCalledTimes(1);
    expect(getCatalogDB).toHaveBeenCalledTimes(1);
  });

  it("keeps restricted requests for viewer group members", async () => {
    const filter = createFilterVisibleApprovalRequests({ getCatalogDB, listGroupMemberShipByUser: membershipOf([viewerGroupId]) });
    const result = await filter({ requests: [restrictedRequest], requestUserId: viewerId, catalogId });
    expect(result._unsafeUnwrap()).toEqual([restrictedRequest]);
  });
});
