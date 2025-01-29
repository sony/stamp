import { describe, expect, it, vi } from "vitest";
import { listApprovalRequestsByCatalog } from "./catalog";
import { RequestDateQuery } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ApprovalRequest } from "@/type";

describe("listApprovalRequestsByCatalog", () => {
  const stampUserId = "testUserId";
  const approvalFlowId = "testApprovalFlowId";
  const catalogId = "testCatalogId";
  const requestDateQuery: RequestDateQuery = {
    start: "2022-01-01T00:00:00Z",
    end: "2022-01-31T23:59:59Z",
  };
  it("should return all approval requests when pagination is not used", async () => {
    const paginationToken = null;
    const mockApprovalRequests1 = {
      items: ["AAA", "BBB"],
      paginationToken: paginationToken,
    };

    const expectedItems = structuredClone(mockApprovalRequests1.items);

    const listByApprovalFlowId = {
      query: vi.fn().mockResolvedValueOnce(mockApprovalRequests1),
    };

    const result = await listApprovalRequestsByCatalog(listByApprovalFlowId, stampUserId, approvalFlowId, catalogId, requestDateQuery);
    expect(result).toEqual(expectedItems);
    expect(listByApprovalFlowId.query.mock.calls.length).toBe(1);
    expect(listByApprovalFlowId.query.mock.calls[0][0]).toStrictEqual({
      approvalFlowId: approvalFlowId,
      catalogId: catalogId,
      requestUserId: stampUserId,
      requestDate: requestDateQuery,
      paginationToken: undefined,
    });
  });

  it("should return paginated approval requests when pagination is used", async () => {
    const paginationToken = "testPaginationToken";

    const mockApprovalRequests1 = {
      items: ["AAA", "BBB"],
      paginationToken: paginationToken,
    };
    const mockApprovalRequests2 = {
      items: ["CCC"],
      paginationToken: null,
    };
    const expectedItems = mockApprovalRequests1.items.concat(mockApprovalRequests2.items);

    const listByApprovalFlowId = {
      query: vi.fn().mockResolvedValueOnce(mockApprovalRequests1).mockResolvedValueOnce(mockApprovalRequests2),
    };

    const result = await listApprovalRequestsByCatalog(listByApprovalFlowId, stampUserId, approvalFlowId, catalogId, requestDateQuery);
    expect(result).toEqual(expectedItems);
    expect(listByApprovalFlowId.query.mock.calls.length).toBe(2);
    expect(listByApprovalFlowId.query.mock.calls[0][0]).toStrictEqual({
      approvalFlowId: approvalFlowId,
      catalogId: catalogId,
      requestUserId: stampUserId,
      requestDate: requestDateQuery,
      paginationToken: undefined,
    });
    expect(listByApprovalFlowId.query.mock.calls[1][0]).toStrictEqual({
      approvalFlowId: approvalFlowId,
      catalogId: catalogId,
      requestUserId: stampUserId,
      requestDate: requestDateQuery,
      paginationToken: paginationToken,
    });
  });

  it("should only return approved requests for a specific user", async () => {
    const userId = "testUserId";
    const requestDateQuery: RequestDateQuery = {
      start: "2022-01-01T00:00:00Z",
      end: "2022-01-31T23:59:59Z",
    };

    const mockApprovalRequests1 = {
      items: [
        {
          status: "submitted",
          catalogId: "catalog1",
          inputParams: [{ id: "param1", value: "value1" }],
          inputResources: [{ resourceTypeId: "resource1", resourceId: "id1" }],
          approverId: "approver1",
          requestUserId: "user1",
          approverType: "group",
          requestId: "request1",
          approvalFlowId: "flow1",
          requestDate: "requestDate",
          requestComment: "Initial request",
        },
        {
          status: "approved",
          catalogId: "catalog2",
          inputParams: [{ id: "param2", value: "value2" }],
          inputResources: [{ resourceTypeId: "resource2", resourceId: "id2" }],
          approverId: "approver2",
          requestUserId: "user2",
          approverType: "group",
          requestId: "request2",
          approvalFlowId: "flow2",
          requestDate: "requestDate",
          requestComment: "Initial request",
          validatedDate: "validatedDate",
          approvedDate: "approvedDate",
          userIdWhoApproved: "user3",
          approvedComment: "Approved successfully",
          validationHandlerResult: {
            isSuccess: true,
            message: "Validation message 1",
          },
          approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
        },
      ],
    };

    const listByApprovalFlowId = {
      query: vi.fn().mockResolvedValueOnce(mockApprovalRequests1),
    };

    const filterByStatusApproved = (items: ApprovalRequest[]) => items?.filter((request) => request.status === "approved");
    const result = await listApprovalRequestsByCatalog(listByApprovalFlowId, userId, approvalFlowId, catalogId, requestDateQuery, filterByStatusApproved);

    const expected = [
      {
        status: "approved",
        catalogId: "catalog2",
        inputParams: [{ id: "param2", value: "value2" }],
        inputResources: [{ resourceTypeId: "resource2", resourceId: "id2" }],
        approverId: "approver2",
        requestUserId: "user2",
        approverType: "group",
        requestId: "request2",
        approvalFlowId: "flow2",
        requestDate: "requestDate",
        requestComment: "Initial request",
        validatedDate: "validatedDate",
        approvedDate: "approvedDate",
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    expect(result).toEqual(expected);
  });
});
