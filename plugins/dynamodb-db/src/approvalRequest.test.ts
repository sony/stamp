import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  ApprovalRequest,
  ValidationFailedRequest,
  PendingRequest,
  ApprovedRequest,
  ApprovedActionSucceededRequest,
  ApprovedActionFailedRequest,
  RejectedRequest,
  CanceledRequest,
  RevokedRequest,
  RevokedActionSucceededRequest,
  RevokedActionFailedRequest,
  SubmittedRequest,
} from "@stamp-lib/stamp-types/models";
import { none } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";
import {
  setImpl,
  getByIdImpl,
  deleteImpl,
  listByApprovalFlowIdImpl,
  listByRequestUserIdImpl,
  listByApproverIdImpl,
  updateStatusToApprovedImpl,
  updateStatusToRevokedImpl,
  updateStatusToRejectedImpl,
  updateStatusToCanceledImpl,
} from "./approvalRequest";

const logger = createLogger("DEBUG", { moduleName: "plugins" });
const tableName = `${process.env.DYNAMO_TABLE_PREFIX}-dynamodb-db-ApprovalRequest`;
const config = { region: "us-west-2" };

const catalogId = "test-catalog-id-request";
const resourceTypeId = "test-resource-type-id-request";
const resourceId = "test-resource-id-request";
const requestId = "526f66ea-17fe-14f3-e0cc-d02cdceb7abc";
const approvalFlowId = "PROMOTE_PERMISSION";
const requestUserId = "27e29081-eeb5-4cd1-95a9-6352a9269e1a";
const approverId = "2ac53bbf-d560-4c69-8ebb-9c252a0eaa8e";
const requestDate = "2023-11-01T08:00:00.000Z";
const approvedDate = "2023-11-01T09:00:00.000Z";
const revokedDate = "2023-11-01T10:00:00.000Z";
const validatedDate = "2023-11-01T11:00:00.000Z";
const rejectedDate = "2023-11-01T12:00:00.000Z";
const canceledDate = "2023-11-01T13:00:00.000Z";

const submittedRequest: SubmittedRequest = {
  status: "submitted",
  catalogId: catalogId,
  inputParams: [
    {
      value: "test-value",
      id: "test-id",
    },
  ],
  approverType: "group",
  inputResources: [
    {
      resourceTypeId: resourceTypeId,
      resourceId: resourceId,
    },
  ],
  requestId: requestId,
  approvalFlowId: approvalFlowId,
  requestUserId: requestUserId,
  approverId: approverId,
  requestDate: requestDate,
  requestComment: "I request this",
};
const validationFailedRequest: ValidationFailedRequest = {
  ...submittedRequest,
  status: "validationFailed",
  validatedDate: validatedDate,
  validationHandlerResult: {
    message: "test-message-validated",
    isSuccess: false,
  },
};
const pendingRequest: PendingRequest = {
  ...submittedRequest,
  status: "pending",
  validatedDate: validatedDate,
  validationHandlerResult: {
    message: "test-message-validated",
    isSuccess: true,
  },
};
const approvedRequest: ApprovedRequest = {
  ...pendingRequest,
  status: "approved",
  approvedDate: approvedDate,
  userIdWhoApproved: requestUserId,
  approvedComment: "I approve this request",
};

/**
 * This object is used for testing data that was created in a past version of Stamp,
 * where the `approvedHandlerResult` property exists.
 */
const approvedRequestWithApprovedHandlerResult: ApprovedRequest = {
  ...approvedRequest,
  approvedHandlerResult: {
    message: "test-message-approved-success",
    isSuccess: true,
  },
};

const approvedActionSucceededRequest: ApprovedActionSucceededRequest = {
  ...approvedRequest,
  status: "approvedActionSucceeded",
  approvedHandlerResult: {
    message: "test-message-approved-success",
    isSuccess: true,
  },
};
const approvedActionFailedRequest: ApprovedActionFailedRequest = {
  ...approvedRequest,
  status: "approvedActionFailed",
  approvedHandlerResult: {
    message: "test-message-approved-failed",
    isSuccess: false,
  },
};
const rejectedRequest: RejectedRequest = {
  ...pendingRequest,
  status: "rejected",
  rejectedDate: rejectedDate,
  userIdWhoRejected: requestUserId,
  rejectComment: "I reject this request",
};

const canceledRequest: CanceledRequest = {
  ...pendingRequest,
  status: "canceled",
  canceledDate: canceledDate,
  userIdWhoCanceled: requestUserId,
  cancelComment: "I cancel this request",
};

const revokedRequest: RevokedRequest = {
  ...approvedActionSucceededRequest,
  status: "revoked",
  revokedDate: revokedDate,
  revokedComment: "I revoke this request",
  userIdWhoRevoked: requestUserId,
};
const revokedActionSucceededRequest: RevokedActionSucceededRequest = {
  ...revokedRequest,
  status: "revokedActionSucceeded",
  revokedHandlerResult: {
    message: "test-message-revoked-success",
    isSuccess: true,
  },
};
const revokedActionFailedRequest: RevokedActionFailedRequest = {
  ...revokedRequest,
  status: "revokedActionFailed",
  revokedHandlerResult: {
    message: "test-message-revoked-failed",
    isSuccess: false,
  },
};

describe("Testing approvalRequest", () => {
  beforeAll(async () => {
    await deleteImpl(logger)(requestId, tableName, config);
  });
  afterAll(async () => {
    await deleteImpl(logger)(requestId, tableName, config);
  });

  describe("setImpl", () => {
    it.each([
      [submittedRequest],
      [validationFailedRequest],
      [pendingRequest],
      [approvedRequest],
      [approvedRequestWithApprovedHandlerResult],
      [approvedActionSucceededRequest],
      [approvedActionFailedRequest],
      [rejectedRequest],
      [canceledRequest],
      [revokedRequest],
      [revokedActionSucceededRequest],
      [revokedActionFailedRequest],
    ])("should successfully set approval request with valid input", async (request) => {
      const expected = structuredClone(request);
      const resultAsync = setImpl(logger)(request, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each([
      [
        "request ID is empty",
        {
          ...submittedRequest,
          requestId: "",
        },
      ],
      [
        "approver ID is empty",
        {
          ...submittedRequest,
          approverId: "",
        },
      ],
      [
        "request user ID is empty",
        {
          ...submittedRequest,
          requestUserId: "",
        },
      ],
      [
        "request date is empty",
        {
          ...submittedRequest,
          requestDate: "",
        },
      ],
      [
        "catalog ID is empty",
        {
          ...submittedRequest,
          catalogId: "",
        },
      ],
      [
        "approval flow ID is empty",
        {
          ...submittedRequest,
          approvalFlowId: "",
        },
      ],
    ])("returns failure result", async (key, approvalRequest) => {
      const resultAsync = setImpl(logger)(approvalRequest, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getByIdImpl", () => {
    it("should successfully get approval request with valid input", async () => {
      const expected: ApprovalRequest = expect.any(Object);
      const resultAsync = getByIdImpl(logger)(requestId, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns none if request ID does not exist", async () => {
      const resultAsync = getByIdImpl(logger)("non-existent-request-id", tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failure result if request ID is empty", async () => {
      const resultAsync = getByIdImpl(logger)("", tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listByApprovalFlowIdImpl", () => {
    it("should successfully list approval requests with valid input", async () => {
      const input = {
        catalogId: catalogId,
        approvalFlowId: approvalFlowId,
        paginationToken: undefined,
        requestDate: undefined,
        limit: undefined,
      };
      const resultAsync = listByApprovalFlowIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.items.length).not.toBe(0);
    });

    it("returns successful result even if catalog ID does not exist", async () => {
      const input = {
        catalogId: "non-existent-catalog-id",
        approvalFlowId: approvalFlowId,
        paginationToken: undefined,
        requestDate: undefined,
        limit: undefined,
      };
      const resultAsync = listByApprovalFlowIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if approval flow ID does not exist", async () => {
      const input = {
        catalogId: catalogId,
        approvalFlowId: "non-existent-approval-id",
        paginationToken: undefined,
        requestDate: undefined,
        limit: undefined,
      };
      const resultAsync = listByApprovalFlowIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it.each([
      [
        "catalog ID is empty",
        {
          catalogId: "",
          approvalFlowId: approvalFlowId,
          paginationToken: undefined,
          requestDate: undefined,
          limit: undefined,
        },
      ],
      [
        "approval flow ID is empty",
        {
          catalogId: catalogId,
          approvalFlowId: "",
          paginationToken: undefined,
          requestDate: undefined,
          limit: undefined,
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = listByApprovalFlowIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listByRequestUserIdImpl", () => {
    it("should successfully list approval requests with valid input", async () => {
      const input = {
        requestUserId: requestUserId,
        paginationToken: undefined,
        requestDate: undefined,
        limit: undefined,
      };
      const resultAsync = listByRequestUserIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.items.length).not.toBe(0);
    });

    it("returns successful result even if request user ID does not exist", async () => {
      const input = {
        requestUserId: "non-existent-request-user-id",
        paginationToken: undefined,
        requestDate: undefined,
        limit: undefined,
      };
      const resultAsync = listByRequestUserIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if request user ID is empty", async () => {
      const input = {
        requestUserId: "",
        paginationToken: undefined,
        requestDate: undefined,
        limit: undefined,
      };
      const resultAsync = listByRequestUserIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listByApproverIdImpl", () => {
    it("should successfully list approval requests with valid input", async () => {
      const input = {
        approverId: approverId,
        paginationToken: undefined,
        requestDate: undefined,
        limit: undefined,
      };
      const resultAsync = listByApproverIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.items.length).not.toBe(0);
    });

    it("returns successful result even if approver ID does not exist", async () => {
      const input = {
        approverId: "non-existent-approver-id",
        paginationToken: undefined,
        requestDate: undefined,
        limit: undefined,
      };
      const resultAsync = listByApproverIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if approver ID is empty", async () => {
      const input = {
        approverId: "",
        paginationToken: undefined,
        requestDate: undefined,
        limit: undefined,
      };
      const resultAsync = listByApproverIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteImpl", () => {
    it("should successfully delete approval request with valid input", async () => {
      const resultAsync = deleteImpl(logger)(requestId, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if request ID does not exist", async () => {
      const resultAsync = deleteImpl(logger)("non-existent-request-id", tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if request ID is empty", async () => {
      const resultAsync = deleteImpl(logger)("", tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("updateStatusToApprovedImpl", () => {
    it("should successfully update status to approved with valid input", async () => {
      const testRequest = {
        ...pendingRequest,
      };
      await setImpl(logger)(testRequest, tableName, config);

      const result = await updateStatusToApprovedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: testRequest.requestId,
          approvedDate: approvedDate,
          userIdWhoApproved: requestUserId,
          approvedComment: "I approve this request",
        },
        tableName,
        config
      );
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(approvedRequest);

      await deleteImpl(logger)(testRequest.requestId, tableName, config);
    });

    it("returns failure result if request ID is not exist", async () => {
      const result = await updateStatusToApprovedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: "not-exist",
          approvedDate: approvedDate,
          userIdWhoApproved: requestUserId,
          approvedComment: "I approve this request",
        },
        tableName,
        config
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request does not exist or status is not pending.");
    });

    it("returns failure result if approval request status is not pending", async () => {
      const testRequest = {
        ...approvedActionSucceededRequest,
      };
      await setImpl(logger)(testRequest, tableName, config);

      const result = await updateStatusToApprovedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: testRequest.requestId,
          approvedDate: approvedDate,
          userIdWhoApproved: requestUserId,
          approvedComment: "I approve this request",
        },
        tableName,
        config
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request does not exist or status is not pending.");

      await deleteImpl(logger)(testRequest.requestId, tableName, config);
    });
  });

  describe("updateStatusToRejectedImpl", () => {
    it("should successfully update status to rejected with valid input", async () => {
      const testRequest = {
        ...pendingRequest,
      };
      await setImpl(logger)(testRequest, tableName, config);

      const result = await updateStatusToRejectedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: testRequest.requestId,
          rejectedDate: rejectedDate,
          userIdWhoRejected: requestUserId,
          rejectComment: "I reject this request",
        },
        tableName,
        config
      );
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(rejectedRequest);

      await deleteImpl(logger)(testRequest.requestId, tableName, config);
    });

    it("returns failure result if request ID does not exist", async () => {
      const result = await updateStatusToRejectedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: "not-exist",
          rejectedDate: rejectedDate,
          userIdWhoRejected: requestUserId,
          rejectComment: "I reject this request",
        },
        tableName,
        config
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request does not exist or status is not pending.");
    });

    it("returns failure result if approval request status is not pending", async () => {
      const testRequest = {
        ...approvedActionSucceededRequest,
      };
      await setImpl(logger)(testRequest, tableName, config);

      const result = await updateStatusToRejectedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: testRequest.requestId,
          rejectedDate: rejectedDate,
          userIdWhoRejected: requestUserId,
          rejectComment: "I reject this request",
        },
        tableName,
        config
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request does not exist or status is not pending.");

      await deleteImpl(logger)(testRequest.requestId, tableName, config);
    });
  });

  describe("updateStatusToRevokedImpl", () => {
    it("should successfully update status to revoked with valid input", async () => {
      const testRequest = {
        ...approvedActionSucceededRequest,
      };
      await setImpl(logger)(testRequest, tableName, config);

      const result = await updateStatusToRevokedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: testRequest.requestId,
          revokedDate: revokedDate,
          userIdWhoRevoked: requestUserId,
          revokedComment: "I revoke this request",
        },
        tableName,
        config
      );
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(revokedRequest);

      await deleteImpl(logger)(testRequest.requestId, tableName, config);
    });

    it("should successfully update status to revoked with valid input when status is approved", async () => {
      const testRequest = {
        ...approvedRequestWithApprovedHandlerResult,
      };
      await setImpl(logger)(testRequest, tableName, config);

      const result = await updateStatusToRevokedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: testRequest.requestId,
          revokedDate: revokedDate,
          userIdWhoRevoked: requestUserId,
          revokedComment: "I revoke this request",
        },
        tableName,
        config
      );
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(revokedRequest);

      await deleteImpl(logger)(testRequest.requestId, tableName, config);
    });

    it("returns failure result if request ID does not exist", async () => {
      const result = await updateStatusToRevokedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: "non-existent-request-id",
          revokedDate: revokedDate,
          userIdWhoRevoked: requestUserId,
          revokedComment: "I revoke this request",
        },
        tableName,
        config
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request does not exist or status is not approvedActionSucceeded or approved.");
    });

    it("returns failure result if approval request status cannot be revoked", async () => {
      const testRequest = {
        ...submittedRequest,
      };
      await setImpl(logger)(testRequest, tableName, config);

      const result = await updateStatusToRevokedImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: testRequest.requestId,
          revokedDate: revokedDate,
          userIdWhoRevoked: requestUserId,
          revokedComment: "I revoke this request",
        },
        tableName,
        config
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request does not exist or status is not approvedActionSucceeded or approved.");

      await deleteImpl(logger)(testRequest.requestId, tableName, config);
    });
  });

  describe("updateStatusToCanceledImpl", () => {
    it("should successfully update status to canceled with valid input", async () => {
      const testRequest = {
        ...pendingRequest,
      };
      await setImpl(logger)(testRequest, tableName, config);

      const result = await updateStatusToCanceledImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: testRequest.requestId,
          canceledDate: canceledDate,
          userIdWhoCanceled: requestUserId,
          cancelComment: "I cancel this request",
        },
        tableName,
        config
      );
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(canceledRequest);

      await deleteImpl(logger)(testRequest.requestId, tableName, config);
    });

    it("returns failure result if request ID does not exist", async () => {
      const result = await updateStatusToCanceledImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: "not-exist",
          canceledDate: canceledDate,
          userIdWhoCanceled: requestUserId,
          cancelComment: "I cancel this request",
        },
        tableName,
        config
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request does not exist or status is not pending.");
    });

    it("returns failure result if approval request status is not pending", async () => {
      const testRequest = {
        ...approvedActionSucceededRequest,
      };
      await setImpl(logger)(testRequest, tableName, config);

      const result = await updateStatusToCanceledImpl(logger)(
        {
          catalogId: catalogId,
          approvalFlowId: approvalFlowId,
          requestId: testRequest.requestId,
          canceledDate: canceledDate,
          userIdWhoCanceled: requestUserId,
          cancelComment: "I cancel this request",
        },
        tableName,
        config
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request does not exist or status is not pending.");

      await deleteImpl(logger)(testRequest.requestId, tableName, config);
    });
  });
});
