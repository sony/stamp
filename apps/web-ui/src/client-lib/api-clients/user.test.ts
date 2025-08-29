import { describe, it, vi, expect, afterEach } from "vitest";
import { listUsers } from "./user";
import type { StampUser } from "@/type";

describe("listUsers", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return an array of users", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const mockResponse: { nextPaginationToken: string | null; users: StampUser[] } = {
      nextPaginationToken: null,
      users: [
        {
          userId: "5a2c6f8e-3b1a-4e7f-9c1d-2f4b6a8c0d1e",
          userName: "User 1",
          email: "user1@example.com",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          userId: "8d9e1f2a-3b4c-5d6e-7f80-91a2b3c4d5e6",
          userName: "User 2",
          email: "user2@example.com",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };

    const mockFetchPromise = Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }));
    mockFetch.mockReturnValue(mockFetchPromise);

    const result = await listUsers();

    expect(result).toEqual(mockResponse.users);
    expect(mockFetch).toHaveBeenCalledWith(`/api/user/list`);
  });

  it("should handle pagination", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const mockResponse1: { nextPaginationToken: string | null; users: StampUser[] } = {
      nextPaginationToken: "abc123",
      users: [
        {
          userId: "5a2c6f8e-3b1a-4e7f-9c1d-2f4b6a8c0d1e",
          userName: "User 1",
          email: "user1@example.com",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          userId: "8d9e1f2a-3b4c-5d6e-7f80-91a2b3c4d5e6",
          userName: "User 2",
          email: "user2@example.com",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    const mockResponse2: { nextPaginationToken: string | null; users: StampUser[] } = {
      nextPaginationToken: null,
      users: [
        {
          userId: "5a2c6f8e-3b1a-4e7f-9c1d-2f4b6a8c0d1e",
          userName: "User 1",
          email: "user1@example.com",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          userId: "8d9e1f2a-3b4c-5d6e-7f80-91a2b3c4d5e6",
          userName: "User 2",
          email: "user2@example.com",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };

    const mockFetchPromise1 = Promise.resolve(new Response(JSON.stringify(mockResponse1), { status: 200 }));
    const mockFetchPromise2 = Promise.resolve(new Response(JSON.stringify(mockResponse2), { status: 200 }));
    mockFetch.mockReturnValueOnce(mockFetchPromise1).mockReturnValueOnce(mockFetchPromise2);

    const result = await listUsers();

    expect(result).toEqual([...mockResponse1.users, ...mockResponse2.users]);
    expect(mockFetch).toHaveBeenCalledWith(`/api/user/list`);
    // next call should carry the paginationToken as a query string
    expect(mockFetch).toHaveBeenCalledWith(`/api/user/list?paginationToken=${mockResponse1.nextPaginationToken}`);
  });

  it("should throw an error if the fetch fails", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const mockFetchPromise = Promise.resolve(new Response("", { status: 500 }));
    mockFetch.mockReturnValue(mockFetchPromise);

    await expect(listUsers()).rejects.toThrow(Error);
  });
});
