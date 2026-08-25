import { none, some } from "@stamp-lib/stamp-option";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { GetApprovalRequestWorkflow } from "./get";

const requester = "dbf33b00-8a5f-e045-4aa1-2d943cb659b6";
const viewerId = "47f29c51-204c-09f6-2069-f3df073568c7";
const viewerGroupId = "1f10d463-a2fe-c407-2b95-05b561346c8b";
const approverGroupId = "18578bed-c45d-4f67-b9f7-10daf4c85f3f";

const baseRequest = {
  requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
  status: "pending",
  catalogId: "test-catalog-id",
  approvalFlowId: "test-approval-flow-id",
  inputParams: [],
  inputResources: [],
  requestUserId: requester,
  approverType: "group",
  approverId: approverGroupId,
  requestDate: "2024-01-01T00:00:00.000Z",
  requestComment: "c",
  validatedDate: "2024-01-01T00:00:00.000Z",
  validationHandlerResult: { isSuccess: true, message: "ok" },
};
const restrictedRequest = { ...baseRequest, visibility: { type: "restricted", viewerGroupIds: [viewerGroupId] } };

const dbWith = (request: unknown | undefined) =>
  ({ getById: vi.fn().mockReturnValue(okAsync(request === undefined ? none : some(request))) }) as unknown as ApprovalRequestDBProvider;
const providersWith = (groups: Array<string>) => ({
  getCatalogDBProvider: vi.fn().mockReturnValue(okAsync(none)),
  listGroupMemberShipByUser: vi
    .fn()
    .mockReturnValue(okAsync({ items: groups.map((groupId) => ({ groupId, userId: viewerId, role: "member", createdAt: "", updatedAt: "" })) })),
});

describe("GetApprovalRequestWorkflow", () => {
  it("returns none when the request does not exist", async () => {
    const result = await GetApprovalRequestWorkflow({ approvalRequestId: "x", requestUserId: viewerId }, dbWith(undefined), providersWith([]));
    expect(result._unsafeUnwrap().isNone()).toBe(true);
  });

  it("returns a request without a snapshot to anyone without identity lookups", async () => {
    const providers = providersWith([]);
    const result = await GetApprovalRequestWorkflow({ approvalRequestId: baseRequest.requestId, requestUserId: viewerId }, dbWith(baseRequest), providers);
    expect(result._unsafeUnwrap().isSome()).toBe(true);
    expect(providers.listGroupMemberShipByUser).not.toHaveBeenCalled();
  });

  it("returns a restricted request to the requester and to viewer / approver group members", async () => {
    for (const [userId, groups] of [
      [requester, []],
      [viewerId, [viewerGroupId]],
      [viewerId, [approverGroupId]],
    ] as Array<[string, Array<string>]>) {
      const result = await GetApprovalRequestWorkflow({ approvalRequestId: baseRequest.requestId, requestUserId: userId }, dbWith(restrictedRequest), providersWith(groups));
      expect(result._unsafeUnwrap().isSome()).toBe(true);
    }
  });

  it("returns FORBIDDEN for unrelated users", async () => {
    const result = await GetApprovalRequestWorkflow({ approvalRequestId: baseRequest.requestId, requestUserId: viewerId }, dbWith(restrictedRequest), providersWith([]));
    expect(result._unsafeUnwrapErr().code).toBe("FORBIDDEN");
  });

  it("rejects an invalid requestUserId", async () => {
    const result = await GetApprovalRequestWorkflow({ approvalRequestId: baseRequest.requestId, requestUserId: "nope" }, dbWith(baseRequest), providersWith([]));
    expect(result._unsafeUnwrapErr().code).toBe("BAD_REQUEST");
  });
});
