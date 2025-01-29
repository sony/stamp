import { describe, expect, it, vi } from "vitest";
import { some } from "@stamp-lib/stamp-option";
import { TRPCClientError } from "@trpc/client";
import { createLogger } from "@stamp-lib/stamp-logger";
import { approveRequest, rejectRequest, getRequestInfo, ApproveRequestInput, RejectRequestInput, GetRequestInput, RequestInfo } from "./approvalRequest";

const logger = createLogger("DEBUG", { moduleName: "slack" });
const userIdWhoApproved = "test-userId-who-approved";
const userIdWhoRejected = "test-userId-who-rejected";
const approvedComment = "test-approved-comment";
const rejectComment = "test-reject-comment";
const approvalRequestId = "test-approval-req-id";

describe("Testing approvalRequest", () => {
  describe("approveRequest", () => {
    it("should approve request and return undefined with valid input", async () => {
      const approveRequestClient = {
        mutate: vi.fn(),
      };
      const input: ApproveRequestInput = {
        userIdWhoApproved: userIdWhoApproved,
        approvedComment: approvedComment,
        approvalRequestId: approvalRequestId,
      };
      const result = await approveRequest(logger, approveRequestClient)(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(undefined);
    });

    it("returns client error if approval request id is empty", async () => {
      const approveRequestClient = {
        mutate: vi.fn().mockRejectedValue(new TRPCClientError("request failed")),
      };
      const input: ApproveRequestInput = {
        userIdWhoApproved: userIdWhoApproved,
        approvedComment: approvedComment,
        approvalRequestId: "",
      };
      const result = await approveRequest(logger, approveRequestClient)(input);
      if (result.isOk()) {
        throw result.value;
      }
      expect(result.error.message).toBe("request failed");
    });

    it("returns error if approveRequest returns error", async () => {
      const approveRequestClient = {
        mutate: vi.fn().mockRejectedValue(new Error("Server Error")),
      };
      const input: ApproveRequestInput = {
        userIdWhoApproved: userIdWhoApproved,
        approvedComment: approvedComment,
        approvalRequestId: approvalRequestId,
      };
      const result = await approveRequest(logger, approveRequestClient)(input);
      if (result.isOk()) {
        throw result.value;
      }
      expect(result.error.message).toBe("Server Error");
    });
  });

  describe("rejectRequest", () => {
    it("should reject request and return undefined with valid input", async () => {
      const rejectRequestClient = {
        mutate: vi.fn(),
      };
      const input: RejectRequestInput = {
        userIdWhoRejected: userIdWhoRejected,
        rejectComment: rejectComment,
        approvalRequestId: approvalRequestId,
      };
      const result = await rejectRequest(logger, rejectRequestClient)(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(undefined);
    });

    it("returns client error if approval request id is empty", async () => {
      const rejectRequestClient = {
        mutate: vi.fn().mockRejectedValue(new TRPCClientError("request failed")),
      };
      const input: RejectRequestInput = {
        userIdWhoRejected: userIdWhoRejected,
        rejectComment: rejectComment,
        approvalRequestId: "",
      };
      const result = await rejectRequest(logger, rejectRequestClient)(input);
      if (result.isOk()) {
        throw result.value;
      }
      expect(result.error.message).toBe("request failed");
    });

    it("returns server error if rejectRequest returns error", async () => {
      const rejectRequestClient = {
        mutate: vi.fn().mockRejectedValue(new Error("Server Error")),
      };
      const input: RejectRequestInput = {
        userIdWhoRejected: userIdWhoRejected,
        rejectComment: rejectComment,
        approvalRequestId: approvalRequestId,
      };
      const result = await rejectRequest(logger, rejectRequestClient)(input);
      if (result.isOk()) {
        throw result.value;
      }
      expect(result.error.message).toBe("Server Error");
    });
  });

  describe("getRequest", () => {
    const requestUserId = "3ad909fe-02d4-4cbf-a084-36b8eeac4e02"; // It's an appropriate value
    it("should get request and return undefined with valid input", async () => {
      const getRequestClient = {
        query: vi.fn().mockResolvedValue({
          requestId: "testRequestId",
          status: "pending" as const,
          catalogId: "testCatalogId",
          inputParams: [{ value: "testValue", id: "testId" }],
          approverType: "group",
          inputResources: [{ resourceTypeId: "testResourceTypeId", resourceId: "testResourceId" }],
          approvalFlowId: "testApprovalFlowId",
          requestUserId: "testRequestUserId",
          approverId: "testApproverId",
          requestDate: "2024-03-18T19:22:38.004Z",
          requestComment: "testComment",
          validatedDate: "2024-03-14T09:04:38.004Z",
          validationHandlerResult: {
            isSuccess: true,
            message: "testMessage",
          },
        }),
      };
      const input: GetRequestInput = {
        approvalRequestId: approvalRequestId,
        requestUserId: requestUserId,
      };
      const expected: RequestInfo = {
        requestId: "testRequestId",
        status: "pending" as const,
        catalogId: "testCatalogId",
        inputParams: [{ value: "testValue", id: "testId" }],
        approverType: "group",
        inputResources: [{ resourceTypeId: "testResourceTypeId", resourceId: "testResourceId" }],
        approvalFlowId: "testApprovalFlowId",
        requestUserId: "testRequestUserId",
        approverId: "testApproverId",
        requestDate: "2024-03-18T19:22:38.004Z",
        requestComment: "testComment",
        validatedDate: "2024-03-14T09:04:38.004Z",
        validationHandlerResult: {
          isSuccess: true,
          message: "testMessage",
        },
      };
      const result = await getRequestInfo(logger, getRequestClient)(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns server error if getRequestInfo returns error", async () => {
      const getRequestClient = {
        query: vi.fn().mockRejectedValue(new Error("Server Error")),
      };
      const input: GetRequestInput = {
        approvalRequestId: approvalRequestId,
        requestUserId: requestUserId,
      };
      const result = await getRequestInfo(logger, getRequestClient)(input);
      if (result.isOk()) {
        throw result.value;
      }
      expect(result.error.message).toBe("Server Error");
    });
  });
});
