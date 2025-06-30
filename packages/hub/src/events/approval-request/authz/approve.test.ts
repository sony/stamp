import { describe, it, vi, expect, afterEach } from "vitest";
import {
  checkCanApproveRequestForFlow,
  CheckCanApproveRequestForFlowInput,
  checkCanApproveRequestForResource,
  CheckCanApproveRequestForResourceInput,
  checkCanApproveRequestForRequestSpecified,
  CheckCanApproveRequestForRequestSpecifiedInput,
} from "./approve";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { StampHubError } from "../../../error";
import { okAsync, errAsync, err, ok } from "neverthrow";
import { none, some } from "@stamp-lib/stamp-option";

describe("approve", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("CheckCanApproveRequestForFlow", () => {
    it("should return okAsync if user is in the approver group", async () => {
      const input: CheckCanApproveRequestForFlowInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "approvalFlow",
          },
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(some({})));

      const result = await checkCanApproveRequestForFlow(getGroupMemberShipProvider)(input);
      expect(result).toEqual(ok(input));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });

    it("should return errAsync if user is not in the approver group", async () => {
      const input: CheckCanApproveRequestForFlowInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "approvalFlow",
          },
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanApproveRequestForFlow(getGroupMemberShipProvider)(input);

      expect(result).toEqual(err(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN")));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });

    it("should return errAsync if approverType is not an approvalFlow", async () => {
      const input: CheckCanApproveRequestForFlowInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "resource",
            resourceTypeId: "test-resource-type",
          },
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanApproveRequestForFlow(getGroupMemberShipProvider)(input);

      expect.assertions(2);
      if (result.isErr()) {
        expect(result.error.code).toEqual("INTERNAL_SERVER_ERROR");
      }

      expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
    });

    it("should return errAsync if getGroupMemberShipProvider returns an error", async () => {
      const input: CheckCanApproveRequestForFlowInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "approvalFlow",
          },
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(errAsync(new Error("test error")));

      const result = await checkCanApproveRequestForFlow(getGroupMemberShipProvider)(input);

      expect(result).toEqual(err(new StampHubError("test error", "test error", "INTERNAL_SERVER_ERROR")));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });
  });

  describe("CheckCanApproveRequestForResource", () => {
    it("should return okAsync if user is in the approver group", async () => {
      const input: CheckCanApproveRequestForResourceInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "resource",
            resourceTypeId: "test-resource-type",
          },
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        resourceOnDB: {
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
          id: "test-resource",
          catalogId: "test-catalog",
          resourceTypeId: "test-resource-type",
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(some({})));

      const result = await checkCanApproveRequestForResource(getGroupMemberShipProvider)(input);

      expect(result).toEqual(ok(input));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });

    it("should return errAsync if user is not in the approver group", async () => {
      const input: CheckCanApproveRequestForResourceInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "resource",
            resourceTypeId: "test-resource-type",
          },
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        resourceOnDB: {
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
          id: "test-resource",
          catalogId: "test-catalog",
          resourceTypeId: "test-resource-type",
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanApproveRequestForResource(getGroupMemberShipProvider)(input);

      expect(result).toEqual(err(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN")));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });
  });

  describe("CheckCanApproveRequestForRequestSpecified", () => {
    const baseInput: CheckCanApproveRequestForRequestSpecifiedInput = {
      userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      approvalFlowInfo: {
        approver: {
          approverType: "requestSpecified" as const,
        },
        description: "test-flow",
        id: "11111111-1111-1111-1111-111111111111",
        name: "test-flow",
        catalogId: "22222222-2222-2222-2222-222222222222",
        inputParams: [],
      },
      catalogId: "22222222-2222-2222-2222-222222222222",
      approvalFlowId: "11111111-1111-1111-1111-111111111111",
      request: {
        requestId: "33333333-3333-3333-3333-333333333333",
        status: "pending" as const,
        catalogId: "22222222-2222-2222-2222-222222222222",
        approvalFlowId: "11111111-1111-1111-1111-111111111111",
        inputParams: [],
        inputResources: [],
        requestUserId: "55555555-5555-5555-5555-555555555555",
        approverType: "group" as const,
        approverId: "8204a484-c5da-4648-810a-c095e2d473a3",
        requestDate: new Date().toISOString(),
        requestComment: "",
        validatedDate: new Date().toISOString(),
        validationHandlerResult: { isSuccess: true, message: "ok" },
      },
    };

    it("should return okAsync if user is in the approver group", async () => {
      const input = { ...baseInput };
      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(some({})));
      const result = await checkCanApproveRequestForRequestSpecified(getGroupMemberShipProvider)(input);
      expect(result).toEqual(ok(input));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });

    it("should return errAsync if user is not in the approver group", async () => {
      const input = { ...baseInput };
      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));
      const result = await checkCanApproveRequestForRequestSpecified(getGroupMemberShipProvider)(input);
      expect(result).toEqual(err(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN")));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });

    it("should return errAsync if approverType is not requestSpecified", async () => {
      const input = {
        ...baseInput,
        approvalFlowInfo: {
          ...baseInput.approvalFlowInfo,
          approver: { approverType: "resource", resourceTypeId: "type-1" },
        },
      };
      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because we are testing error handling
      const result = await checkCanApproveRequestForRequestSpecified(getGroupMemberShipProvider)(input as any);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
      }
      expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
    });

    it("should return errAsync if request.approverType is not group", async () => {
      const input = {
        ...baseInput,
        request: {
          ...baseInput.request,
          approverType: "not-group", // purposely invalid for this test
        },
      };
      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because we are testing error handling
      const result = await checkCanApproveRequestForRequestSpecified(getGroupMemberShipProvider)(input as any);
      // zodのバリデーションエラーになるため、エラー内容を柔軟に比較
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toMatchObject({
          message: expect.stringContaining("Invalid enum value"),
        });
      }
      expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
    });

    it("should return errAsync if getGroupMemberShipProvider returns an error", async () => {
      const input = { ...baseInput };
      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(errAsync(new Error("test error")));
      const result = await checkCanApproveRequestForRequestSpecified(getGroupMemberShipProvider)(input);
      expect(result).toEqual(err(new StampHubError("test error", "test error", "INTERNAL_SERVER_ERROR")));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });
  });
});
