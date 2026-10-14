import { afterEach, describe, expect, it, vi } from "vitest";
import { listGroups } from "./group";

const group = (groupId: string, groupName: string) => ({
  groupId,
  groupName,
  description: "",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

describe("listGroups", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns the groups of a single page", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    const response = { items: [group("g1", "Group 1"), group("g2", "Group 2")] };
    mockFetch.mockReturnValue(Promise.resolve(new Response(JSON.stringify(response), { status: 200 })));

    const result = await listGroups();

    expect(result).toEqual(response.items);
    expect(mockFetch).toHaveBeenCalledWith("/api/group/list");
  });

  it("follows nextPaginationToken", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    mockFetch.mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify({ items: [group("g1", "Group 1")], nextPaginationToken: "abc123" }), { status: 200 })));
    mockFetch.mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify({ items: [group("g2", "Group 2")] }), { status: 200 })));

    const result = await listGroups();

    expect(result.map((g) => g.groupId)).toEqual(["g1", "g2"]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/group/list?paginationToken=abc123");
  });

  it("passes groupNamePrefix", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    mockFetch.mockReturnValue(Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 })));

    await listGroups({ groupNamePrefix: "dev team" });

    expect(mockFetch).toHaveBeenCalledWith("/api/group/list?groupNamePrefix=dev+team");
  });

  it("throws when the response is not ok", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    mockFetch.mockReturnValue(Promise.resolve(new Response("error", { status: 500, statusText: "Internal Server Error" })));

    await expect(listGroups()).rejects.toThrow("Failed to fetch groups");
  });
});
