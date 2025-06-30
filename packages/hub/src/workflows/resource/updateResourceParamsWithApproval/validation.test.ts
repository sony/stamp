import { describe, it, expect } from "vitest";
import {
  validateInput,
  validateResourceTypeUpdatable,
  validateResourceTypeHasUpdateCapability,
  validateResourceNotPending,
  validateApproverType,
  validateParentResourceApprover,
  validateApprovalFlowExists,
} from "./validation";

describe("updateResourceParamsWithApproval.validation", () => {
  describe("validateInput", () => {
    it("should return success for valid input", () => {
      const validInput = {
        catalogId: "cat-1",
        resourceTypeId: "type-1",
        resourceId: "res-1",
        updateParams: { foo: "bar" },
        requestUserId: "user-1",
      };

      const result = validateInput(validInput);
      expect(result.isOk()).toBe(true);
    });

    it("should return error for invalid input", () => {
      const invalidInput = {
        catalogId: "cat-1",
        resourceTypeId: "type-1",
        resourceId: "res-1",
        updateParams: "invalid", // Should be an object, not string
        requestUserId: "user-1",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validateInput(invalidInput as any);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("validateResourceTypeUpdatable", () => {
    it("should return success when resource type is updatable", () => {
      const resourceTypeInfo = {
        isUpdatable: true,
        updateApprover: { approverType: "parentResource" },
      };

      const result = validateResourceTypeUpdatable(resourceTypeInfo);
      expect(result.isOk()).toBe(true);
    });

    it("should return success when resource type has updateApprover even if not updatable", () => {
      const resourceTypeInfo = {
        isUpdatable: false,
        updateApprover: { approverType: "parentResource" },
      };

      const result = validateResourceTypeUpdatable(resourceTypeInfo);
      expect(result.isOk()).toBe(true);
    });

    it("should return error when resource type is not updatable and has no updateApprover", () => {
      const resourceTypeInfo = {
        isUpdatable: false,
        updateApprover: null,
      };

      const result = validateResourceTypeUpdatable(resourceTypeInfo);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("ResourceType Not Updatable");
      }
    });
  });

  describe("validateResourceTypeHasUpdateCapability", () => {
    it("should return success when resource type is updatable", () => {
      const resourceTypeInfo = { isUpdatable: true };

      const result = validateResourceTypeHasUpdateCapability(resourceTypeInfo);
      expect(result.isOk()).toBe(true);
    });

    it("should return error when resource type is not updatable", () => {
      const resourceTypeInfo = { isUpdatable: false };

      const result = validateResourceTypeHasUpdateCapability(resourceTypeInfo);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Resource Type Not Updatable");
      }
    });
  });

  describe("validateResourceNotPending", () => {
    it("should return success when resource has no pending updates", () => {
      const resource = { pendingUpdateParams: null };

      const result = validateResourceNotPending(resource);
      expect(result.isOk()).toBe(true);
    });

    it("should return error when resource has pending updates", () => {
      const resource = {
        pendingUpdateParams: {
          approvalRequestId: "req-1",
          updateParams: { foo: "bar" },
        },
      };

      const result = validateResourceNotPending(resource);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Resource Pending Update");
      }
    });
  });

  describe("validateApproverType", () => {
    it("should return success for parentResource approver type", () => {
      const updateApprover = { approverType: "parentResource" };

      const result = validateApproverType(updateApprover);
      expect(result.isOk()).toBe(true);
    });

    it("should return success when no updateApprover is provided", () => {
      const result = validateApproverType(undefined);
      expect(result.isOk()).toBe(true);
    });

    it("should return error for 'this' approver type", () => {
      const updateApprover = { approverType: "this" };

      const result = validateApproverType(updateApprover);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Approver type is 'this'");
      }
    });
  });

  describe("validateParentResourceApprover", () => {
    it("should return success when parent resource has approver group", () => {
      const parentResource = { approverGroupId: "group-1" };

      const result = validateParentResourceApprover(parentResource);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("group-1");
      }
    });

    it("should return error when parent resource is not found", () => {
      const result = validateParentResourceApprover(undefined);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Parent Resource Not Found");
      }
    });

    it("should return error when parent resource has no approver group", () => {
      const parentResource = { approverGroupId: undefined };

      const result = validateParentResourceApprover(parentResource);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Parent Resource No Approver Group");
      }
    });
  });

  describe("validateApprovalFlowExists", () => {
    it("should return success when resource-update flow exists", () => {
      const catalogConfig = {
        approvalFlows: [{ id: "other-flow" }, { id: "resource-update" }],
      };

      const result = validateApprovalFlowExists(catalogConfig);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe("resource-update");
      }
    });

    it("should return error when resource-update flow does not exist", () => {
      const catalogConfig = {
        approvalFlows: [{ id: "other-flow" }, { id: "different-flow" }],
      };

      const result = validateApprovalFlowExists(catalogConfig);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Internal server error");
        expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
      }
    });
  });
});
