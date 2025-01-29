import { describe, it, expect, vi } from "vitest";
import { okAsync } from "neverthrow";
import { listCatalogInfo } from "./list";

describe("Testing listCatalogInfo", () => {
  const ownerGroupId = "testOwnerGroupId";
  const approvalFlowId = "testApprovalFlowId";
  const description = "description";
  const name = "name";
  const resourceTypeId = "resourceTypeId";

  it("should return catalog info matching mock data when listCatalogInfo is called", async () => {
    const id = "testId";
    const listAllCatalogInfoSuccess = vi.fn().mockReturnValue(
      okAsync([
        {
          id: id,
          ownerGroupId: ownerGroupId,
        },
      ])
    );
    const listCatalogInfoOnConfigSuccess = vi.fn().mockReturnValue(
      okAsync([
        {
          id: id,
          name: name,
          description: description,
          approvalFlowIds: [approvalFlowId],
          resourceTypeIds: [resourceTypeId],
        },
      ])
    );
    const result = await listCatalogInfo(listAllCatalogInfoSuccess, listCatalogInfoOnConfigSuccess)();
    if (result.isErr()) {
      throw result.error;
    }

    const list = result.value;
    expect(listAllCatalogInfoSuccess.mock.calls.length).toBe(1);
    expect(listAllCatalogInfoSuccess.mock.calls[0][0]).toBe(undefined);
    expect(listCatalogInfoOnConfigSuccess.mock.calls.length).toBe(1);
    expect(listCatalogInfoOnConfigSuccess.mock.calls[0][0]).toBe(undefined);
    expect(result.isOk()).toBe(true);
    expect(list).toEqual([
      {
        id: id,
        ownerGroupId: ownerGroupId,
        name: name,
        description: description,
        approvalFlowIds: [approvalFlowId],
        resourceTypeIds: [resourceTypeId],
      },
    ]);
  });
});
