import { describe, it, expect, vi } from "vitest";
import { createStampSystemCatalog } from "./index";

describe("createStampSystemCatalog", () => {
  it("should return a CatalogConfig object with expected structure", () => {
    const resourceDBProvider = {
      getById: vi.fn(),
      set: vi.fn(),
      updatePendingUpdateParams: vi.fn(),
      delete: vi.fn(),
      createAuditNotification: vi.fn(),
      updateAuditNotification: vi.fn(),
      deleteAuditNotification: vi.fn(),
    };
    const catalogConfigProvider = {
      get: vi.fn(),
    };
    const catalog = createStampSystemCatalog({ resourceDBProvider, catalogConfigProvider });
    expect(catalog).toHaveProperty("id", "stamp-system");
    expect(catalog).toHaveProperty("approvalFlows");
    expect(Array.isArray(catalog.approvalFlows)).toBe(true);
    expect(catalog.approvalFlows[0]).toHaveProperty("handlers");
    expect(typeof catalog.approvalFlows[0].handlers.approvalRequestValidation).toBe("function");
    expect(typeof catalog.approvalFlows[0].handlers.approved).toBe("function");
  });
});
