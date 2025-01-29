import { none, some } from "@stamp-lib/stamp-option";
import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { describe, expect, it } from "vitest";
import { createCatalogConfigProvider, getCatalogConfig } from "./catalogConfig";

describe("getCatalogConfig", () => {
  const catalogConfigMap = new Map<string, CatalogConfig>([
    ["1", { id: "1", name: "Catalog 1", description: "Description 1", approvalFlows: [], resourceTypes: [] }],
    ["2", { id: "2", name: "Catalog 2", description: "Description 2", approvalFlows: [], resourceTypes: [] }],
  ]);

  it("should return some(config) if the config exists", async () => {
    const result = await getCatalogConfig(catalogConfigMap)("1");
    expect(result._unsafeUnwrap()).toEqual(some(catalogConfigMap.get("1")));
  });

  it("should return none if config does not exist", async () => {
    const result = await getCatalogConfig(catalogConfigMap)("3");
    expect(result._unsafeUnwrap()).toEqual(none);
  });
});

describe("createCatalogConfigProvider", () => {
  const catalogConfigMap = new Map<string, CatalogConfig>([
    ["1", { id: "1", name: "Catalog 1", description: "Description 1", approvalFlows: [], resourceTypes: [] }],
    ["2", { id: "2", name: "Catalog 2", description: "Description 2", approvalFlows: [], resourceTypes: [] }],
  ]);

  it("should return catalog config provider", async () => {
    const provider = createCatalogConfigProvider(catalogConfigMap);
    expect(provider.get).toBeDefined();
  });
});
