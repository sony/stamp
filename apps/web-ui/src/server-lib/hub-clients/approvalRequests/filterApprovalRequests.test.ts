import { describe, it, expect } from "vitest";
import { parseStatusType, parseInputParams, parseInputResources, filterApprovalRequests, FilterParam } from "./filterApprovalRequests";
import { ApprovalRequest } from "@/type";

describe("parseStatusType", () => {
  it("should return the status when it is a valid status value", () => {
    const validStatus = "submitted";
    const result = parseStatusType(validStatus);
    expect(result).toBe(validStatus);
  });

  it("should return undefined for an invalid status value", () => {
    const invalidStatus = "notAValidStatus";
    const result = parseStatusType(invalidStatus);
    expect(result).toBeUndefined();
  });

  it("should return undefined when the status is undefined", () => {
    const undefinedStatus = undefined;
    const result = parseStatusType(undefinedStatus);
    expect(result).toBeUndefined();
  });

  it("should handle all valid status values correctly", () => {
    const statusValues = ["submitted", "validationFailed", "pending", "approved", "approvedActionFailed", "rejected", "revoked", "revokedActionFailed"];
    statusValues.forEach((status) => {
      const result = parseStatusType(status);
      expect(result).toBe(status);
    });
  });
});

describe("parseInputParams", () => {
  it("should correctly parse input parameters with the default prefix", () => {
    const searchParams = {
      inputParams_name: "John Doe",
      inputParams_age: "30",
      otherParam: "shouldNotAppear",
    };
    const expected = [
      { id: "name", value: "John Doe" },
      { id: "age", value: "30" },
    ];
    const result = parseInputParams(searchParams);
    expect(result).toEqual(expected);
  });

  it("should correctly parse input parameters with a custom prefix", () => {
    const searchParams = {
      customPrefix_name: "Jane Doe",
      customPrefix_age: "25",
      inputParams_name: "shouldNotAppear",
    };
    const expected = [
      { id: "name", value: "Jane Doe" },
      { id: "age", value: "25" },
    ];
    const result = parseInputParams(searchParams, "customPrefix_");
    expect(result).toEqual(expected);
  });

  it("should ignore non-string values", () => {
    const searchParams = {
      inputParams_name: "John Doe",
      inputParams_age: ["30", "31"], // This should be ignored
      inputParams_location: undefined, // This should also be ignored
    };
    const expected = [{ id: "name", value: "John Doe" }];
    const result = parseInputParams(searchParams);
    expect(result).toEqual(expected);
  });

  it("should return an empty array if no matching parameters are found", () => {
    const searchParams = {
      name: "John Doe",
      age: "30",
    };
    const result = parseInputParams(searchParams);
    expect(result).toEqual([]);
  });
});

describe("parseInputResources", () => {
  it("should correctly parse input resources with the default prefix", () => {
    const searchParams = {
      inputResources_user: "123",
      inputResources_project: "456",
      otherParam: "shouldNotAppear",
    };
    const expected = [
      { resourceTypeId: "user", resourceId: "123" },
      { resourceTypeId: "project", resourceId: "456" },
    ];
    const result = parseInputResources(searchParams);
    expect(result).toEqual(expected);
  });

  it("should correctly parse input resources with a custom prefix", () => {
    const searchParams = {
      customPrefix_user: "789",
      customPrefix_project: "101112",
      inputResources_user: "shouldNotAppear",
    };
    const expected = [
      { resourceTypeId: "user", resourceId: "789" },
      { resourceTypeId: "project", resourceId: "101112" },
    ];
    const result = parseInputResources(searchParams, "customPrefix_");
    expect(result).toEqual(expected);
  });

  it("should ignore non-string values", () => {
    const searchParams = {
      inputResources_user: "123",
      inputResources_project: ["456", "789"], // This should be ignored
      inputResources_location: undefined, // This should also be ignored
    };
    const expected = [{ resourceTypeId: "user", resourceId: "123" }];
    const result = parseInputResources(searchParams);
    expect(result).toEqual(expected);
  });

  it("should return an empty array if no matching parameters are found", () => {
    const searchParams = {
      user: "123",
      project: "456",
    };
    const result = parseInputResources(searchParams);
    expect(result).toEqual([]);
  });
});

describe("filterApprovalRequests", () => {
  it("should filter requests by status", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
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
        requestDate: new Date().toISOString(),
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
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = { status: "submitted", inputParams: [], inputResources: [] };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(1);
    expect(result[0].status).toBe("submitted");
  });

  it("should return requests that status is approved or approvedActionSucceeded when status filter is 'approved'", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
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
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
      },
      {
        status: "approvedActionSucceeded",
        catalogId: "catalog2",
        inputParams: [{ id: "param2", value: "value2" }],
        inputResources: [{ resourceTypeId: "resource2", resourceId: "id2" }],
        approverId: "approver2",
        requestUserId: "user2",
        approverType: "group",
        requestId: "request2",
        approvalFlowId: "flow2",
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
      {
        status: "submitted",
        catalogId: "catalog3",
        inputParams: [{ id: "param3", value: "value3" }],
        inputResources: [{ resourceTypeId: "resource3", resourceId: "id3" }],
        approverId: "approver3",
        requestUserId: "user3",
        approverType: "group",
        requestId: "request3",
        approvalFlowId: "flow3",
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
      },
    ];

    const filterParam: FilterParam = { status: "approved", inputParams: [], inputResources: [] };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(2);
    expect(result[0].status).toBe("approved");
    expect(result[1].status).toBe("approvedActionSucceeded");
  });

  it("should return requests that status is revoked or revokedActionSucceeded when status filter is 'revoked'", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
      {
        status: "revoked",
        catalogId: "catalog2",
        inputParams: [{ id: "param2", value: "value2" }],
        inputResources: [{ resourceTypeId: "resource2", resourceId: "id2" }],
        approverId: "approver2",
        requestUserId: "user2",
        approverType: "group",
        requestId: "request2",
        approvalFlowId: "flow2",
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
        revokedDate: new Date().toISOString(),
        revokedComment: "Revoked successfully",
        userIdWhoRevoked: "user4",
      },
      {
        status: "revokedActionSucceeded",
        catalogId: "catalog2",
        inputParams: [{ id: "param2", value: "value2" }],
        inputResources: [{ resourceTypeId: "resource2", resourceId: "id2" }],
        approverId: "approver2",
        requestUserId: "user2",
        approverType: "group",
        requestId: "request2",
        approvalFlowId: "flow2",
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
        revokedDate: new Date().toISOString(),
        revokedComment: "Revoked successfully",
        userIdWhoRevoked: "user4",
        revokedHandlerResult: { isSuccess: true, message: "Revocation message 1" },
      },
      {
        status: "submitted",
        catalogId: "catalog3",
        inputParams: [{ id: "param3", value: "value3" }],
        inputResources: [{ resourceTypeId: "resource3", resourceId: "id3" }],
        approverId: "approver3",
        requestUserId: "user3",
        approverType: "group",
        requestId: "request3",
        approvalFlowId: "flow3",
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
      },
    ];

    const filterParam: FilterParam = { status: "revoked", inputParams: [], inputResources: [] };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(2);
    expect(result[0].status).toBe("revoked");
    expect(result[1].status).toBe("revokedActionSucceeded");
  });
  it("should filter requests by inputParams (string case)", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
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
        requestDate: new Date().toISOString(),
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
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = {
      inputParams: [{ id: "param1", value: "value1" }],
      inputResources: [],
    };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(1);
    expect(result[0].inputParams).toEqual([{ id: "param1", value: "value1" }]);
  });

  it("should filter requests by inputParams (number case)", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
      {
        status: "submitted",
        catalogId: "catalog1",
        inputParams: [{ id: "param1", value: 100 }],
        inputResources: [{ resourceTypeId: "resource1", resourceId: "id1" }],
        approverId: "approver1",
        requestUserId: "user1",
        approverType: "group",
        requestId: "request1",
        approvalFlowId: "flow1",
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
      },
      {
        status: "approved",
        catalogId: "catalog2",
        inputParams: [{ id: "param2", value: 200 }],
        inputResources: [{ resourceTypeId: "resource2", resourceId: "id2" }],
        approverId: "approver2",
        requestUserId: "user2",
        approverType: "group",
        requestId: "request2",
        approvalFlowId: "flow2",
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = {
      inputParams: [{ id: "param1", value: 100 }],
      inputResources: [],
    };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(1);
    expect(result[0].inputParams).toEqual([{ id: "param1", value: 100 }]);
  });

  it("should filter requests by inputParams (boolean case)", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
      {
        status: "submitted",
        catalogId: "catalog1",
        inputParams: [{ id: "param1", value: false }],
        inputResources: [{ resourceTypeId: "resource1", resourceId: "id1" }],
        approverId: "approver1",
        requestUserId: "user1",
        approverType: "group",
        requestId: "request1",
        approvalFlowId: "flow1",
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
      },
      {
        status: "approved",
        catalogId: "catalog2",
        inputParams: [{ id: "param2", value: true }],
        inputResources: [{ resourceTypeId: "resource2", resourceId: "id2" }],
        approverId: "approver2",
        requestUserId: "user2",
        approverType: "group",
        requestId: "request2",
        approvalFlowId: "flow2",
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = {
      inputParams: [{ id: "param1", value: false }],
      inputResources: [],
    };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(1);
    expect(result[0].inputParams).toEqual([{ id: "param1", value: false }]);
  });

  it("should filter requests by inputResources", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
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
        requestDate: new Date().toISOString(),
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
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = {
      inputParams: [],
      inputResources: [{ resourceTypeId: "resource1", resourceId: "id1" }],
    };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(1);
    expect(result[0].inputResources).toEqual([{ resourceTypeId: "resource1", resourceId: "id1" }]);
  });

  it("should filter requests by approverId", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
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
        requestDate: new Date().toISOString(),
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
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = { approverId: "approver1", inputParams: [], inputResources: [] };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(1);
    expect(result[0].approverId).toBe("approver1");
  });

  it("should filter requests by requestUserId", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
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
        requestDate: new Date().toISOString(),
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
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = { requestUserId: "user1", inputParams: [], inputResources: [] };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(1);
    expect(result[0].requestUserId).toBe("user1");
  });

  it("should filter requests by catalogId", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
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
        requestDate: new Date().toISOString(),
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
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = { catalogId: "catalog2", inputParams: [], inputResources: [] };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(1);
    expect(result[0].catalogId).toBe("catalog2");
  });

  it("should filter requests by approvalFlowId", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
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
        requestDate: new Date().toISOString(),
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
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = { approvalFlowId: "flow2", inputParams: [], inputResources: [] };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(1);
    expect(result[0].approvalFlowId).toBe("flow2");
  });

  it("should return all requests when no filter is applied", () => {
    const mockApprovalRequests: ApprovalRequest[] = [
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
        requestDate: new Date().toISOString(),
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
        requestDate: new Date().toISOString(),
        requestComment: "Initial request",
        validatedDate: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        userIdWhoApproved: "user3",
        approvedComment: "Approved successfully",
        validationHandlerResult: {
          isSuccess: true,
          message: "Validation message 1",
        },
        approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
      },
    ];

    const filterParam: FilterParam = { inputParams: [], inputResources: [] };
    const result = filterApprovalRequests(filterParam)(mockApprovalRequests);
    expect(result.length).toBe(2);
  });
});
