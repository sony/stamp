import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { isAdmin } from "./isAdmin";
import { User } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { none, some } from "@stamp-lib/stamp-option";
describe("isAdmin", () => {
  const userId: string = "05bf84b9-f92b-4312-a1e4-9557ad854054"; // random uuid;

  it("Should return false for a non-admin user without the role property", async () => {
    const user: User = {
      userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      userName: "testUser",
      email: "testUser@example.com",
    };

    const notAdminValue = vi.fn().mockReturnValue(okAsync(some(user)));

    const isAdminResult = await isAdmin(notAdminValue)({ userId: userId });
    expect(isAdminResult.isOk()).toBe(true);
    isAdminResult.map((value) => {
      expect(value).toBe(false);
    });
  });

  it("Should return false for a non-admin user with an empty role array", async () => {
    const user: User = {
      userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      userName: "testUser",
      email: "testUser@example.com",
      role: [],
    };

    const notAdminValue = vi.fn().mockReturnValue(okAsync(some(user)));

    const isAdminResult = await isAdmin(notAdminValue)({ userId: userId });
    expect(isAdminResult.isOk()).toBe(true);
    isAdminResult.map((value) => {
      expect(value).toBe(false);
    });
  });

  it("Should return false for a non-admin user with a different role", async () => {
    const user = {
      userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      userName: "testUser",
      email: "testUser@example.com",
      role: ["User"],
    };

    const notAdminValue = vi.fn().mockReturnValue(okAsync(some(user)));

    const isAdminResult = await isAdmin(notAdminValue)({ userId: userId });
    expect(isAdminResult.isOk()).toBe(true);
    isAdminResult.map((value) => {
      expect(value).toBe(false);
    });
  });

  it("Should return true for an admin user", async () => {
    const user = {
      userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      userName: "testUser",
      email: "testUser@example.com",
      role: ["Admin"],
    };

    const adminValue = vi.fn().mockReturnValue(okAsync(some(user)));

    const isAdminResult = await isAdmin(adminValue)({ userId: userId });
    expect(isAdminResult.isOk()).toBe(true);
    isAdminResult.map((value) => {
      expect(value).toBe(true);
    });
  });

  it("Should return false when the user is not found", async () => {
    const notFoundValue = vi.fn().mockReturnValue(okAsync(none));

    const isAdminResult = await isAdmin(notFoundValue)({ userId: userId });
    expect(isAdminResult.isOk()).toBe(true);
    isAdminResult.map((value) => {
      expect(value).toBe(false);
    });
  });
});
