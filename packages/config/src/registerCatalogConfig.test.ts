import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { okAsync } from "neverthrow";
import { registerCatalogConfig } from "./registerCatalogConfig";
import { describe, expect, it } from "vitest";

describe("registerCatalogConfig", () => {
  it("should register a catalog config", async () => {
    const catalog: CatalogConfig = {
      id: "1",
      name: "Catalog1",
      description: "testCatalogDescription",
      approvalFlows: [],
      resourceTypes: [],
    };
    const catalogConfigMap = new Map<string, Readonly<CatalogConfig>>();
    const register = registerCatalogConfig(catalogConfigMap);

    const result = register(catalog);

    expect(result).toEqual(okAsync(undefined));
    expect(catalogConfigMap.get("1")).toEqual(catalog);
  });
});
