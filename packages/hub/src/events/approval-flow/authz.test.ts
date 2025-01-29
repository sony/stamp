import { describe, expect, it, vi } from "vitest";
import { checkCanEditApprovalFlowImpl, createCheckCanEditApprovalFlow } from "./authz";
import { EditApprovalFlowInput } from "../../inputAuthzModel";
import { StampHubError } from "../../error";
import { okAsync } from "neverthrow";

describe("authz", () => {
  describe("checkCanEditApprovalFlowImpl", () => {
    it("should return input when user is catalog owner", async () => {
      const input: EditApprovalFlowInput = {
        catalogId: "testCatalogId",
        approvalFlowId: "testApprovalFlowId",
        requestUserId: "b867df44-33fb-461e-9747-76cf2c6cb8b8",
      };
      const expected = structuredClone(input);
      const isCatalogOwner = vi.fn().mockReturnValue(okAsync(true));

      const result = await checkCanEditApprovalFlowImpl(input, isCatalogOwner);
      if (result.isErr()) {
        throw result.error;
      }

      const value = result.value;
      expect(result.isOk()).toBe(true);
      expect(value).toStrictEqual(expected);
    });

    it("should return error when user is not catalog owner", async () => {
      const input: EditApprovalFlowInput = {
        catalogId: "testCatalogId",
        approvalFlowId: "testApprovalFlowId",
        requestUserId: "b867df44-33fb-461e-9747-76cf2c6cb8b8",
      };
      const isCatalogOwner = vi.fn().mockReturnValue(okAsync(false));

      const result = await checkCanEditApprovalFlowImpl(input, isCatalogOwner);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StampHubError);
    });

    it("should return error when requestUserId is not a UUID", async () => {
      const input: EditApprovalFlowInput = {
        catalogId: "testCatalogId",
        approvalFlowId: "testApprovalFlowId",
        requestUserId: "not-a-uuid",
      };
      const isCatalogOwner = vi.fn().mockReturnValue(okAsync(true));

      const result = await checkCanEditApprovalFlowImpl(input, isCatalogOwner);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StampHubError);
    });
  });

  describe("createCheckCanEditApprovalFlow", () => {
    it("should create a CheckCanEditApprovalFlow function", () => {
      const isCatalogOwner = vi.fn().mockReturnValue(okAsync(true));
      const checkCanEditApprovalFlow = createCheckCanEditApprovalFlow(isCatalogOwner);
      expect(typeof checkCanEditApprovalFlow).toBe("function");
    });
  });
});
