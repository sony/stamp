import { describe, it, expect, vi, afterEach } from "vitest";
import { getResourceType } from "./resourceType";

describe("getResourceType", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it("should return the resource type when fetch is successful", async () => {
    // Mock the fetch function
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock the response
    const mockResponse = { id: "123", name: "Test Resource Type" };
    const mockFetchPromise = Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }));
    mockFetch.mockReturnValue(mockFetchPromise);

    const catalogId = "test-catalog";
    const resourceTypeId = "test-resourceType";
    const requestUserId = "test-user";
    const result = await getResourceType({ catalogId, resourceTypeId, requestUserId });

    expect(result).toEqual({ id: "123", name: "Test Resource Type" });
    expect(fetch).toHaveBeenCalledWith(`/api/resourceType/get?catalogId=${catalogId}&resourceTypeId=${resourceTypeId}&requestUserId=${requestUserId}`);
  });

  it("should throw an error when fetch fails", async () => {
    // Mock the fetch function
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock the response
    const mockFetchPromise = Promise.resolve(new Response("", { status: 500 }));
    mockFetch.mockReturnValue(mockFetchPromise);

    const catalogId = "test-catalog";
    const resourceTypeId = "test-resourceType";
    const requestUserId = "test-user";

    await expect(getResourceType({ catalogId, resourceTypeId, requestUserId })).rejects.toThrow(Error);
  });
});
