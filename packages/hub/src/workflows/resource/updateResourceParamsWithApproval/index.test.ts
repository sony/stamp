import { describe, it, expect, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { updateResourceParamsWithApproval } from "./index";
import { createLogger } from "@stamp-lib/stamp-logger";
import type { WorkflowDependencies } from "./index";

describe("updateResourceParamsWithApproval (main composition)", () => {
  const validInput = {
    catalogId: "550e8400-e29b-41d4-a716-446655440000",
    resourceTypeId: "550e8400-e29b-41d4-a716-446655440001",
    resourceId: "550e8400-e29b-41d4-a716-446655440002",
    updateParams: { foo: "bar" },
    requestUserId: "550e8400-e29b-41d4-a716-446655440003",
    comment: "Test comment",
  };

  it("should successfully complete the entire workflow", async () => {
    const workflowDeps: WorkflowDependencies = {
      getResourceTypeInfo: vi.fn().mockReturnValue(
        okAsync({
          id: "test-resource-type",
          name: "Test Resource Type",
          isUpdatable: true,
          catalogId: "test-catalog",
          description: "Test description",
          createParams: [],
          infoParams: [],
          parentResourceTypeId: undefined,
          isCreatable: true,
          isDeletable: true,
          ownerManagement: false,
          approverManagement: false,
          updateApprover: undefined,
        })
      ),
      resolveResource: vi.fn().mockReturnValue(okAsync({ resource: "mock" })),
      resolveApprover: vi.fn().mockReturnValue(okAsync("approver-group-id")),
      getSystemCatalogResult: vi.fn().mockReturnValue(okAsync({ approvalFlows: [{ id: "resource-update" }] })),
      executeWorkflow: vi.fn().mockReturnValue(okAsync({ approvalRequestId: "req-123" })),
      logger: createLogger("DEBUG", { moduleName: "test" }),
    };
    const resultAsync = updateResourceParamsWithApproval(workflowDeps)(validInput);
    const result = await resultAsync;
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ approvalRequestId: "req-123" });
  });

  it("should handle input validation errors", async () => {
    const workflowDeps: WorkflowDependencies = {
      getResourceTypeInfo: vi.fn(),
      resolveResource: vi.fn(),
      resolveApprover: vi.fn(),
      getSystemCatalogResult: vi.fn(),
      executeWorkflow: vi.fn(),
      logger: createLogger("DEBUG", { moduleName: "test" }),
    };
    const invalidInput = { ...validInput, updateParams: "invalid" as unknown as Record<string, string | number | boolean | string[]> };
    const resultAsync = updateResourceParamsWithApproval(workflowDeps)(invalidInput);
    const result = await resultAsync;
    expect(result.isErr()).toBe(true);
  });

  it("should handle system catalog errors", async () => {
    const workflowDeps: WorkflowDependencies = {
      getResourceTypeInfo: vi.fn().mockReturnValue(
        okAsync({
          id: "test-resource-type",
          name: "Test Resource Type",
          isUpdatable: true,
          catalogId: "test-catalog",
          description: "Test description",
          createParams: [],
          infoParams: [],
          parentResourceTypeId: undefined,
          isCreatable: true,
          isDeletable: true,
          ownerManagement: false,
          approverManagement: false,
          updateApprover: undefined,
        })
      ),
      resolveResource: vi.fn().mockReturnValue(okAsync({ resource: "mock" })),
      resolveApprover: vi.fn().mockReturnValue(okAsync("approver-group-id")),
      getSystemCatalogResult: vi.fn().mockReturnValue(errAsync(new Error("system catalog error"))),
      executeWorkflow: vi.fn(),
      logger: createLogger("DEBUG", { moduleName: "test" }),
    };
    const resultAsync = updateResourceParamsWithApproval(workflowDeps)(validInput);
    const result = await resultAsync;
    expect(result.isErr()).toBe(true);
  });
});
