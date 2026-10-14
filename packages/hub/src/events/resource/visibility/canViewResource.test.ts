import { none, some } from "@stamp-lib/stamp-option";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckCanViewResource, createPrepareResourceVisibilityFilter, isResourceVisibleTo } from "./canViewResource";

const userId = "47f29c51-204c-09f6-2069-f3df073568c7";
const catalogOwnerGroupId = "0a3d8d5b-7a3f-4b2e-9c1d-2f4e6a8b0c1d";
const ownerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd";
const approverGroupId = "18578bed-c45d-4f67-b9f7-10daf4c85f3f";
const requesterGroupId = "1f10d463-a2fe-c407-2b95-05b561346c8b";
const parentOwnerGroupId = "5e8f1c2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b";
const unrelatedGroupId = "7c2b9e4d-1a3f-4c5e-9b8a-6d5c4b3a2f1e";

const catalogId = "test-catalog-id";
const resourceTypeId = "test-resource-type-id";
const parentResourceTypeId = "test-parent-resource-type-id";
const resourceId = "res-1";
const parentResourceId = "parent-1";

const restrictedRow: ResourceOnDB = {
  id: resourceId,
  catalogId,
  resourceTypeId,
  ownerGroupId,
  approverGroupId,
  requesterGroupIds: [requesterGroupId],
  visibility: "restricted",
};
const parentRow: ResourceOnDB = { id: parentResourceId, catalogId, resourceTypeId: parentResourceTypeId, ownerGroupId: parentOwnerGroupId };

const viewer = (groups: Array<string>, isCatalogOwner = false) => ({ userGroupIds: new Set(groups), isCatalogOwner });

describe("isResourceVisibleTo", () => {
  it("is visible to everyone when there is no DB row or visibility is not restricted", () => {
    expect(isResourceVisibleTo({ resourceOnDB: none, viewer: viewer([]) })).toBe(true);
    expect(isResourceVisibleTo({ resourceOnDB: some({ ...restrictedRow, visibility: undefined }), viewer: viewer([]) })).toBe(true);
    expect(isResourceVisibleTo({ resourceOnDB: some({ ...restrictedRow, visibility: "all" }), viewer: viewer([]) })).toBe(true);
  });

  it.each([
    ["catalog owner", viewer([], true)],
    ["owner group member", viewer([ownerGroupId])],
    ["approver group member", viewer([approverGroupId])],
    ["requester group member", viewer([requesterGroupId])],
  ])("restricted resource is visible to %s", (_label, v) => {
    expect(isResourceVisibleTo({ resourceOnDB: some(restrictedRow), viewer: v })).toBe(true);
  });

  it("restricted resource is visible to the parent owner when parentOwnerGroupId is given", () => {
    expect(isResourceVisibleTo({ resourceOnDB: some(restrictedRow), parentOwnerGroupId, viewer: viewer([parentOwnerGroupId]) })).toBe(true);
    expect(isResourceVisibleTo({ resourceOnDB: some(restrictedRow), viewer: viewer([parentOwnerGroupId]) })).toBe(false);
  });

  it("restricted resource is hidden from unrelated users", () => {
    expect(isResourceVisibleTo({ resourceOnDB: some(restrictedRow), parentOwnerGroupId, viewer: viewer([unrelatedGroupId]) })).toBe(false);
  });
});

function membershipOf(groups: Array<string>) {
  return vi.fn().mockReturnValue(okAsync({ items: groups.map((groupId) => ({ groupId, userId, role: "member", createdAt: "", updatedAt: "" })) }));
}
const catalogDBWithOwner = vi.fn().mockReturnValue(okAsync(some({ id: catalogId, ownerGroupId: catalogOwnerGroupId })));

describe("createCheckCanViewResource", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes unrestricted resources without any identity or catalog lookup", async () => {
    const listByUser = membershipOf([]);
    const getResourceDB = vi.fn();
    const check = createCheckCanViewResource({ getResourceDB, getCatalogDB: catalogDBWithOwner, listGroupMemberShipByUser: listByUser });
    const result = await check({ requestUserId: userId, catalogId, resourceOnDB: some({ ...restrictedRow, visibility: undefined }) });
    expect(result.isOk()).toBe(true);
    expect(listByUser).not.toHaveBeenCalled();
    expect(catalogDBWithOwner).not.toHaveBeenCalled();
    expect(getResourceDB).not.toHaveBeenCalled();
  });

  it("passes members of owner / approver / requester groups and the catalog owner", async () => {
    for (const groups of [[ownerGroupId], [approverGroupId], [requesterGroupId], [catalogOwnerGroupId]]) {
      const check = createCheckCanViewResource({ getResourceDB: vi.fn(), getCatalogDB: catalogDBWithOwner, listGroupMemberShipByUser: membershipOf(groups) });
      const result = await check({ requestUserId: userId, catalogId, resourceOnDB: some(restrictedRow) });
      expect(result.isOk()).toBe(true);
    }
  });

  it("consults the parent only when no other rule matched, and passes the parent owner", async () => {
    const getResourceDB = vi.fn().mockReturnValue(okAsync(some(parentRow)));
    const resolveParent = vi.fn().mockReturnValue(okAsync(some({ resourceTypeId: parentResourceTypeId, resourceId: parentResourceId })));
    const check = createCheckCanViewResource({ getResourceDB, getCatalogDB: catalogDBWithOwner, listGroupMemberShipByUser: membershipOf([parentOwnerGroupId]) });
    const result = await check({ requestUserId: userId, catalogId, resourceOnDB: some(restrictedRow), resolveParent });
    expect(result.isOk()).toBe(true);
    expect(resolveParent).toHaveBeenCalledTimes(1);
    expect(getResourceDB).toHaveBeenCalledWith({ id: parentResourceId, catalogId, resourceTypeId: parentResourceTypeId });
  });

  it("does not resolve the parent when the viewer already matches", async () => {
    const resolveParent = vi.fn();
    const check = createCheckCanViewResource({ getResourceDB: vi.fn(), getCatalogDB: catalogDBWithOwner, listGroupMemberShipByUser: membershipOf([ownerGroupId]) });
    await check({ requestUserId: userId, catalogId, resourceOnDB: some(restrictedRow), resolveParent });
    expect(resolveParent).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for unrelated users (with and without a parent)", async () => {
    const withParent = createCheckCanViewResource({
      getResourceDB: vi.fn().mockReturnValue(okAsync(some(parentRow))),
      getCatalogDB: catalogDBWithOwner,
      listGroupMemberShipByUser: membershipOf([unrelatedGroupId]),
    });
    const r1 = await withParent({
      requestUserId: userId,
      catalogId,
      resourceOnDB: some(restrictedRow),
      resolveParent: () => okAsync(some({ resourceTypeId: parentResourceTypeId, resourceId: parentResourceId })),
    });
    expect(r1._unsafeUnwrapErr().code).toBe("FORBIDDEN");

    const withoutParent = createCheckCanViewResource({ getResourceDB: vi.fn(), getCatalogDB: catalogDBWithOwner, listGroupMemberShipByUser: membershipOf([unrelatedGroupId]) });
    const r2 = await withoutParent({ requestUserId: userId, catalogId, resourceOnDB: some(restrictedRow) });
    expect(r2._unsafeUnwrapErr().code).toBe("FORBIDDEN");
    const r3 = await withoutParent({ requestUserId: userId, catalogId, resourceOnDB: some(restrictedRow), resolveParent: () => okAsync(none) });
    expect(r3._unsafeUnwrapErr().code).toBe("FORBIDDEN");
  });
});

describe("createPrepareResourceVisibilityFilter", () => {
  beforeEach(() => vi.clearAllMocks());

  const rowsByType = (rows: Array<ResourceOnDB>, parents: Array<ResourceOnDB> = []) =>
    vi.fn().mockImplementation((input: { resourceTypeId: string }) => okAsync({ items: input.resourceTypeId === parentResourceTypeId ? parents : rows }));

  it("shows everything without identity lookups when no row is restricted", async () => {
    const listByUser = membershipOf([]);
    const listResourceByResourceType = rowsByType([{ ...restrictedRow, visibility: undefined }]);
    const prepare = createPrepareResourceVisibilityFilter({ listResourceByResourceType, getCatalogDB: catalogDBWithOwner, listGroupMemberShipByUser: listByUser });
    const isVisible = (await prepare({ requestUserId: userId, catalogId, resourceTypeId, parentResourceTypeId }))._unsafeUnwrap();
    expect(isVisible({ id: resourceId })).toBe(true);
    expect(isVisible({ id: "other" })).toBe(true);
    expect(listResourceByResourceType).toHaveBeenCalledTimes(1);
    expect(listByUser).not.toHaveBeenCalled();
  });

  it("shows everything to the catalog owner without loading parent rows", async () => {
    const listResourceByResourceType = rowsByType([restrictedRow], [parentRow]);
    const prepare = createPrepareResourceVisibilityFilter({
      listResourceByResourceType,
      getCatalogDB: catalogDBWithOwner,
      listGroupMemberShipByUser: membershipOf([catalogOwnerGroupId]),
    });
    const isVisible = (await prepare({ requestUserId: userId, catalogId, resourceTypeId, parentResourceTypeId }))._unsafeUnwrap();
    expect(isVisible({ id: resourceId })).toBe(true);
    expect(listResourceByResourceType).toHaveBeenCalledTimes(1);
  });

  it("filters restricted rows for unrelated users but keeps unrestricted ones", async () => {
    const listResourceByResourceType = rowsByType([restrictedRow], [parentRow]);
    const prepare = createPrepareResourceVisibilityFilter({
      listResourceByResourceType,
      getCatalogDB: catalogDBWithOwner,
      listGroupMemberShipByUser: membershipOf([unrelatedGroupId]),
    });
    const isVisible = (await prepare({ requestUserId: userId, catalogId, resourceTypeId, parentResourceTypeId }))._unsafeUnwrap();
    expect(isVisible({ id: resourceId, parentResourceId })).toBe(false);
    expect(isVisible({ id: "no-row-resource" })).toBe(true);
    // type rows + parent type rows
    expect(listResourceByResourceType).toHaveBeenCalledTimes(2);
  });

  it("shows restricted rows to requester members and to the parent owner", async () => {
    const listResourceByResourceType = rowsByType([restrictedRow], [parentRow]);
    const asRequester = createPrepareResourceVisibilityFilter({
      listResourceByResourceType,
      getCatalogDB: catalogDBWithOwner,
      listGroupMemberShipByUser: membershipOf([requesterGroupId]),
    });
    expect((await asRequester({ requestUserId: userId, catalogId, resourceTypeId, parentResourceTypeId }))._unsafeUnwrap()({ id: resourceId })).toBe(true);

    const asParentOwner = createPrepareResourceVisibilityFilter({
      listResourceByResourceType,
      getCatalogDB: catalogDBWithOwner,
      listGroupMemberShipByUser: membershipOf([parentOwnerGroupId]),
    });
    const isVisible = (await asParentOwner({ requestUserId: userId, catalogId, resourceTypeId, parentResourceTypeId }))._unsafeUnwrap();
    expect(isVisible({ id: resourceId, parentResourceId })).toBe(true);
    expect(isVisible({ id: resourceId })).toBe(false); // no parent id on the item -> parent rule cannot apply
  });

  it("reflects rows from a second page of listByResourceType", async () => {
    const listResourceByResourceType = vi
      .fn()
      .mockReturnValueOnce(okAsync({ items: [], paginationToken: "t1" }))
      .mockReturnValueOnce(okAsync({ items: [restrictedRow] }));
    const prepare = createPrepareResourceVisibilityFilter({
      listResourceByResourceType,
      getCatalogDB: catalogDBWithOwner,
      listGroupMemberShipByUser: membershipOf([unrelatedGroupId]),
    });
    const isVisible = (await prepare({ requestUserId: userId, catalogId, resourceTypeId }))._unsafeUnwrap();
    expect(isVisible({ id: resourceId })).toBe(false);
  });
});
