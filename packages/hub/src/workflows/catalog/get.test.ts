import { describe, it, expect, vi } from "vitest";
import { some } from "@stamp-lib/stamp-option";
import { okAsync } from "neverthrow";
import { getCatalogInfo } from "./get";

describe("Testing getCatalogInfo", () => {
  const catalogId = "testCatalogId";
  const ownerGroupId = "testOwnerGroupId";
  const approvalGroupId = "testApproverGroupId";
  const approvalFlowId = "testApprovalFlowId";
  const description = "description";
  const name = "name";
  const resourceTypeId = "resourceTypeId";

  it("should return matching catalog and config info for ID", async () => {
    const id = "testId";
    const getCatalogInfoSuccess = vi.fn().mockReturnValue(
      okAsync(
        some({
          id: id,
          catalogId: catalogId,
          ownerGroupId: ownerGroupId,
          approverGroupId: approvalGroupId,
        })
      )
    );
    const getCatalogInfoConfigSuccess = vi.fn().mockReturnValue(
      okAsync(
        some({
          id: id,
          name: name,
          description: description,
          catalogId: catalogId,
          approvalFlowIds: [approvalFlowId],
          resourceTypeIds: [resourceTypeId],
        })
      )
    );
    const result = await getCatalogInfo(getCatalogInfoSuccess, getCatalogInfoConfigSuccess)(id);
    if (result.isErr()) {
      throw result.error;
    }

    const approvalFlowInfo = result.value;
    expect(getCatalogInfoSuccess.mock.calls.length).toBe(1);
    expect(getCatalogInfoSuccess.mock.calls[0][0]).toBe(id);
    expect(getCatalogInfoConfigSuccess.mock.calls.length).toBe(1);
    expect(getCatalogInfoConfigSuccess.mock.calls[0][0]).toBe(id);
    expect(result.isOk()).toBe(true);
    expect(approvalFlowInfo).toStrictEqual(
      some({
        id: id,
        catalogId: catalogId,
        ownerGroupId: ownerGroupId,
        approverGroupId: approvalGroupId,
        name: name,
        description: description,
        approvalFlowIds: [approvalFlowId],
        resourceTypeIds: [resourceTypeId],
      })
    );
  });
});
