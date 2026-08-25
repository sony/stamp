import { expect, it, describe, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { none, some } from "@stamp-lib/stamp-option";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { StampHubError } from "../../error";
import { listByRequestUserIdWorkflow, ListByRequestUserIdInput, listByApprovalFlowIdWorkflow, ListByApprovalFlowId } from "./list";

describe("listByRequestUserIdWorkflow", () => {
  const userId = "80ad2471-1326-a98e-ea2f-fc8146d09019";
  const requestUserId = "1ef4f797-c58a-47e5-8039-a5b2e78a798c";
  it("should return the expected result when the input is valid", async () => {
    const input: ListByRequestUserIdInput = {
      userId: userId,
      requestUserId: requestUserId,
    };

    const expected = {
      requestId: "1",
      catalogId: "catalog1",
      approvalFlowId: "approvalFlow1",
      requestUserId: requestUserId,
      requestDate: new Date(2024, 0, 1),
      approverId: "approver1",
      status: "pending",
    };
    const listByRequestUserIdSuccess = vi.fn().mockReturnValue(
      okAsync({
        items: [expected],
      })
    );
    const validateRequestUserIdSuccess = vi.fn().mockReturnValue(okAsync(input));

    const listByRequestUserIdResult = await listByRequestUserIdWorkflow(listByRequestUserIdSuccess, validateRequestUserIdSuccess)(input);
    if (listByRequestUserIdResult.isErr()) {
      throw listByRequestUserIdResult.error;
    }
    expect(listByRequestUserIdSuccess.mock.calls.length).toBe(1);
    expect(listByRequestUserIdSuccess.mock.calls[0][0]).toStrictEqual({ requestUserId: requestUserId, requestDate: undefined, paginationToken: undefined });
    expect(validateRequestUserIdSuccess.mock.calls.length).toBe(1);
    expect(validateRequestUserIdSuccess.mock.calls[0][0]).toStrictEqual({ userId: userId, requestUserId: requestUserId });
    expect(listByRequestUserIdResult.isOk()).toBe(true);
    expect(listByRequestUserIdResult.value).toEqual({ items: [expected] });
  });

  it("should return a BAD_REQUEST error when the user ID is invalid", async () => {
    const invalidUserId = "1234567890";
    const listByRequestUserIdSuccess = vi.fn().mockReturnValue(okAsync({ items: [] }));
    const validateRequestUserIdError = vi.fn().mockReturnValue(errAsync(new StampHubError("Request User not found", "Request User Not Found", "BAD_REQUEST")));

    const listByRequestUserIdResult = await listByRequestUserIdWorkflow(
      listByRequestUserIdSuccess,
      validateRequestUserIdError
    )({
      userId: invalidUserId,
      requestUserId: requestUserId,
    });
    if (listByRequestUserIdResult.isErr()) {
      expect(listByRequestUserIdResult.error.code).toBe("BAD_REQUEST");
    }
    expect(listByRequestUserIdSuccess.mock.calls.length).toBe(0);
    expect(validateRequestUserIdError.mock.calls.length).toBe(0);
    expect(listByRequestUserIdResult.isOk()).toBe(false);
  });

  it("should return a BAD_REQUEST error when the request user ID is invalid", async () => {
    const invalidRequestUserId = "1234567890";
    const listByRequestUserIdSuccess = vi.fn().mockReturnValue(okAsync({ items: [] }));
    const validateRequestUserIdError = vi.fn().mockReturnValue(errAsync(new StampHubError("Request User not found", "Request User Not Found", "BAD_REQUEST")));

    const listByRequestUserIdResult = await listByRequestUserIdWorkflow(
      listByRequestUserIdSuccess,
      validateRequestUserIdError
    )({
      userId: userId,
      requestUserId: invalidRequestUserId,
    });
    if (listByRequestUserIdResult.isErr()) {
      expect(listByRequestUserIdResult.error.code).toBe("BAD_REQUEST");
    }
    expect(listByRequestUserIdSuccess.mock.calls.length).toBe(0);
    expect(validateRequestUserIdError.mock.calls.length).toBe(0);
    expect(listByRequestUserIdResult.isOk()).toBe(false);
  });
});

describe("listByApprovalFlowIdWorkflow", () => {
  const requester = "dbf33b00-8a5f-e045-4aa1-2d943cb659b6";
  const viewerId = "47f29c51-204c-09f6-2069-f3df073568c7";
  const viewerGroupId = "1f10d463-a2fe-c407-2b95-05b561346c8b";
  const catalogId = "test-catalog-id";
  const approvalFlowId = "test-approval-flow-id";
  const getCatalogConfigProvider = vi.fn().mockReturnValue(
    okAsync(
      some({
        id: catalogId,
        name: "c",
        description: "c",
        approvalFlows: [{ id: approvalFlowId, name: "f", description: "f", inputParams: [], inputResources: [], approver: { approverType: "approvalFlow" }, handlers: {} }],
        resourceTypes: [],
      })
    )
  );
  const openRequest = { requestId: "1", catalogId, approvalFlowId, requestUserId: requester, approverType: "group", approverId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f", status: "pending" };
  const restrictedRequest = { ...openRequest, requestId: "2", visibility: { type: "restricted", viewerGroupIds: [viewerGroupId] } };
  const dbWith = (items: Array<unknown>, paginationToken?: string) =>
    ({ listByApprovalFlowId: vi.fn().mockReturnValue(okAsync({ items, paginationToken })) }) as unknown as ApprovalRequestDBProvider;
  const providersWith = (groups: Array<string>) => ({
    getCatalogDBProvider: vi.fn().mockReturnValue(okAsync(none)),
    listGroupMemberShipByUser: vi
      .fn()
      .mockReturnValue(okAsync({ items: groups.map((groupId) => ({ groupId, userId: viewerId, role: "member", createdAt: "", updatedAt: "" })) })),
  });
  const input: ListByApprovalFlowId = { catalogId, approvalFlowId, requestUserId: viewerId };

  it("hides restricted requests from unrelated users while keeping paginationToken", async () => {
    const providers = providersWith([]);
    const result = await listByApprovalFlowIdWorkflow(input, getCatalogConfigProvider, dbWith([openRequest, restrictedRequest], "next"), providers);
    expect(result._unsafeUnwrap()).toEqual({ items: [openRequest], paginationToken: "next" });
    expect(providers.listGroupMemberShipByUser).toHaveBeenCalledTimes(1);
    expect(providers.getCatalogDBProvider).toHaveBeenCalledTimes(1);
  });

  it("shows restricted requests to viewer group members and to the requester", async () => {
    const asMember = await listByApprovalFlowIdWorkflow(input, getCatalogConfigProvider, dbWith([openRequest, restrictedRequest]), providersWith([viewerGroupId]));
    expect(asMember._unsafeUnwrap().items.map((r) => r.requestId)).toEqual(["1", "2"]);
    const providers = providersWith([]);
    const asRequester = await listByApprovalFlowIdWorkflow({ ...input, requestUserId: requester }, getCatalogConfigProvider, dbWith([openRequest, restrictedRequest]), providers);
    expect(asRequester._unsafeUnwrap().items.map((r) => r.requestId)).toEqual(["1", "2"]);
    expect(providers.listGroupMemberShipByUser).not.toHaveBeenCalled();
  });

  it("does no identity lookup when no request has a snapshot", async () => {
    const providers = providersWith([]);
    const result = await listByApprovalFlowIdWorkflow(input, getCatalogConfigProvider, dbWith([openRequest]), providers);
    expect(result._unsafeUnwrap().items.length).toBe(1);
    expect(providers.listGroupMemberShipByUser).not.toHaveBeenCalled();
  });
});
