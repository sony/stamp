import { describe, expect, it, vi } from "vitest";
import { listGroups } from "./group";

describe("listGroups", () => {
  it("should return all groups without pagination", async () => {
    const requestUserId = "testUserId";
    const mockGroups = {
      items: [
        {
          groupId: "group1",
          groupName: "Group 1",
          description: "Description of Group 1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          groupId: "group2",
          groupName: "Group 2",
          description: "Description of Group 2",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const listByRequestUserId = {
      query: vi.fn().mockResolvedValueOnce(mockGroups),
    };

    const result = await listGroups(listByRequestUserId, requestUserId);
    expect(result).toEqual(mockGroups.items);
  });

  it("should handle empty group list", async () => {
    const requestUserId = "testUserId";
    const mockGroups = {
      items: [],
    };

    const listByRequestUserId = {
      query: vi.fn().mockResolvedValueOnce(mockGroups),
    };

    const result = await listGroups(listByRequestUserId, requestUserId);
    expect(result).toEqual(mockGroups.items);
  });

  it("should return paginated groups for the user when pagination is used", async () => {
    const requestUserId = "testUserId";
    const paginationToken = "testPaginationToken";
    const mockGroups1 = {
      items: [
        {
          groupId: "group1",
          groupName: "Group 1",
          description: "Description of Group 1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          groupId: "group2",
          groupName: "Group 2",
          description: "Description of Group 2",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      nextPaginationToken: paginationToken,
    };
    const mockGroups2 = {
      items: [
        {
          groupId: "group3",
          groupName: "Group 3",
          description: "Description of Group 3",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      nextPaginationToken: null,
    };
    const expectedItems = mockGroups1.items.concat(mockGroups2.items);

    const listByRequestUserId = {
      query: vi.fn().mockResolvedValueOnce(mockGroups1).mockResolvedValueOnce(mockGroups2),
    };

    const result = await listGroups(listByRequestUserId, requestUserId);
    expect(result).toEqual(expectedItems);
    expect(listByRequestUserId.query.mock.calls.length).toBe(2);
    expect(listByRequestUserId.query.mock.calls[0][0]).toStrictEqual({
      requestUserId: requestUserId,
      paginationToken: undefined,
    });
    expect(listByRequestUserId.query.mock.calls[1][0]).toStrictEqual({
      requestUserId: requestUserId,
      paginationToken: paginationToken,
    });
  });
});
