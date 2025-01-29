import { describe, it, expect, vi, afterEach } from "vitest";
import { getApprovalFlow } from "./approvalFlow";

describe("getApprovalFlow", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it("should return the approval flow when fetch is successful", async () => {
    // Mock the fetch function
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock the response
    const mockResponse = { id: "123", name: "Test Approval Flow" };
    const mockFetchPromise = Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }));
    mockFetch.mockReturnValue(mockFetchPromise);

    const catalogId = "test-catalog";
    const approvalFlowId = "test-approvalFlow";
    const result = await getApprovalFlow({ catalogId, approvalFlowId });

    expect(result).toEqual({ id: "123", name: "Test Approval Flow" });
    expect(mockFetch).toHaveBeenCalledWith(`/api/approvalFlow/get?catalogId=${catalogId}&approvalFlowId=${approvalFlowId}`);
  });

  it("should throw an error when fetch fails", async () => {
    // Mock the fetch function
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock the response
    const mockFetchPromise = Promise.resolve(new Response("", { status: 500 }));
    mockFetch.mockReturnValue(mockFetchPromise);

    const catalogId = "test-catalog";
    const approvalFlowId = "test-approvalFlow";

    await expect(getApprovalFlow({ catalogId, approvalFlowId })).rejects.toThrow(Error);
  });
});
