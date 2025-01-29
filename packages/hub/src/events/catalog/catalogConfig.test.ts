import { expect, it, describe, vi, beforeEach } from "vitest";
import { getCatalogConfigImpl, GetCatalogConfigInput } from "./catalogConfig";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { okAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";

describe("getCatalogConfigImpl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return catalogConfig if catalog exists", async () => {
    const catalogId = "123";
    const input: GetCatalogConfigInput = {
      catalogId,
    };

    const catalogConfig: CatalogConfig = {
      id: catalogId,
      name: "test Catalog",
      description: "Approval flows for renting unicorns.",
      approvalFlows: [],
      resourceTypes: [],
    };

    const getCatalogConfigProvider: CatalogConfigProvider["get"] = () => {
      return okAsync(some(catalogConfig));
    };

    const result = await getCatalogConfigImpl(input, getCatalogConfigProvider);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.catalogConfig).toEqual(catalogConfig);
  });

  it("should return an error if catalog does not exist", async () => {
    const catalogId = "123";
    const input: GetCatalogConfigInput = {
      catalogId,
    };

    const getCatalogConfigProvider: CatalogConfigProvider["get"] = () => {
      return okAsync(none);
    };

    const result = await getCatalogConfigImpl(input, getCatalogConfigProvider);

    expect(result.isOk()).toBe(false);
    if (result.isOk()) {
      throw new Error("test failed");
    }
    expect(result.error.code).toBe("BAD_REQUEST");
  });
});
