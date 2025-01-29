import { expect, it, describe, vi, beforeEach } from "vitest";
import { validateCatalogIdImpl } from "./validation";
import { some, none } from "@stamp-lib/stamp-option";
import { okAsync } from "neverthrow";

describe("validateCatalogIdImpl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return ok if catalog exists", async () => {
    // Mock the dependencies
    const getCatalogConfigProviderMock = vi.fn().mockResolvedValue(
      okAsync(
        some({
          id: "test-catalog-id",
          name: "test Catalog",
          description: "Approval flows for renting unicorns.",
          approvalFlows: [],
          resourceTypes: [],
        })
      )
    );
    const input = { catalogId: "test-catalog-id" };

    // Call the function
    const result = await validateCatalogIdImpl(input, getCatalogConfigProviderMock);

    // Assertions
    expect(getCatalogConfigProviderMock).toHaveBeenCalledWith(input.catalogId);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toStrictEqual(input);
  });

  it("should return same input params", async () => {
    // Mock the dependencies
    const getCatalogConfigProviderMock = vi.fn().mockResolvedValue(
      okAsync(
        some({
          id: "test-catalog-id",
          name: "test Catalog",
          description: "Approval flows for renting unicorns.",
          approvalFlows: [],
          resourceTypes: [],
        })
      )
    );
    const input = { catalogId: "test-catalog-id", otherParam: "test" };

    // Call the function
    const result = await validateCatalogIdImpl(input, getCatalogConfigProviderMock);

    // Assertions
    expect(getCatalogConfigProviderMock).toHaveBeenCalledWith(input.catalogId);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toStrictEqual(input);
  });

  it("should return error if catalog does not exist", async () => {
    // Mock the dependencies
    const getCatalogConfigProviderMock = vi.fn().mockResolvedValue(okAsync(none));
    const input = { catalogId: "test-catalog-id" };
    // Call the function
    const result = await validateCatalogIdImpl(input, getCatalogConfigProviderMock);

    // Assertions
    expect(getCatalogConfigProviderMock).toHaveBeenCalledWith(input.catalogId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});
