import { listResourceOutlines } from "./resource";
import { describe, it, vi, expect, afterEach } from "vitest";
describe("listResources", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it("should return an array of ResourceOutline", async () => {
    const catalogId = "123456";
    const resourceTypeId = "789012";
    const parentResourceId = "345678";

    // Mock the fetch function
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock the response
    const mockResponse = {
      paginationToken: null,
      items: [
        { params: [], id: "1", name: "Resource 1", catalogId, resourceTypeId, parentResourceId },
        { params: [], id: "2", name: "Resource 2", catalogId, resourceTypeId, parentResourceId },
      ],
    };
    const mockFetchPromise = Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }));
    mockFetch.mockReturnValue(mockFetchPromise);

    const result = await listResourceOutlines({ catalogId, resourceTypeId, parentResourceId });

    expect(result).toEqual(mockResponse.items);
    expect(mockFetch).toHaveBeenCalledWith(`/api/resource/list?catalogId=${catalogId}&resourceTypeId=${resourceTypeId}&parentResourceId=${parentResourceId}`);
  });

  it("should handle pagination", async () => {
    const catalogId = "123456";
    const resourceTypeId = "789012";
    const parentResourceId = "345678";

    // Mock the fetch function
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock the response with pagination
    const mockResponse1 = {
      paginationToken: "abc123",
      items: [
        { params: [], id: "1", name: "Resource 1", catalogId, resourceTypeId, parentResourceId },
        { params: [], id: "2", name: "Resource 2", catalogId, resourceTypeId, parentResourceId },
      ],
    };
    const mockFetchPromise1 = Promise.resolve(new Response(JSON.stringify(mockResponse1), { status: 200 }));
    mockFetch.mockReturnValueOnce(mockFetchPromise1);

    const mockResponse2 = {
      paginationToken: null,
      items: [
        { params: [], id: "3", name: "Resource 3", catalogId, resourceTypeId, parentResourceId },
        { params: [], id: "4", name: "Resource 4", catalogId, resourceTypeId, parentResourceId },
      ],
    };
    const mockFetchPromise2 = Promise.resolve(new Response(JSON.stringify(mockResponse2), { status: 200 }));
    mockFetch.mockReturnValueOnce(mockFetchPromise2);

    const result = await listResourceOutlines({ catalogId, resourceTypeId, parentResourceId });

    expect(result).toEqual([...mockResponse1.items, ...mockResponse2.items]);
    expect(mockFetch).toHaveBeenCalledWith(`/api/resource/list?catalogId=${catalogId}&resourceTypeId=${resourceTypeId}&parentResourceId=${parentResourceId}`);
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/resource/list?catalogId=${catalogId}&resourceTypeId=${resourceTypeId}&parentResourceId=${parentResourceId}&paginationToken=${mockResponse1.paginationToken}`
    );
  });

  it("should throw an error if the fetch fails", async () => {
    const catalogId = "123456";
    const resourceTypeId = "789012";
    const parentResourceId = "345678";

    // Mock the fetch function
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock the response
    const mockFetchPromise = Promise.resolve(new Response("", { status: 500 }));
    mockFetch.mockReturnValue(mockFetchPromise);

    await expect(listResourceOutlines({ catalogId, resourceTypeId, parentResourceId })).rejects.toThrow(Error);
  });
});
