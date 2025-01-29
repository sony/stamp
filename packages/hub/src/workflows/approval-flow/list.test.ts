import { describe, it, expect, vi } from "vitest";
import { okAsync } from "neverthrow";
import { listApprovalFlowInfo } from "./list";

describe("Testing listApprovalFlowInfo", () => {
  const catalogId = "test-catalog-id";
  const approvalFlowId = "testApprovalFlowId";
  const ownerGroupId = "testOwnerGroupId";
  const approvalGroupId = "testApproverGroupId";
  const id = "id";
  const name = "name";
  const description = "description";
  const type = "string";
  const resourceTypeId = "resourceTypeId";
  const approverType = "approvalFlow";

  it("should return correct approval flow information when listByCatalogId and listInfoByCatalogId are successful", async () => {
    const listByCatalogIdSuccess = vi.fn().mockReturnValue(
      okAsync([
        {
          id: approvalFlowId,
          catalogId: catalogId,
          ownerGroupId: ownerGroupId,
          approverGroupId: approvalGroupId,
        },
      ])
    );
    const listInfoByCatalogIdSuccess = vi.fn().mockReturnValue(
      okAsync([
        {
          id: approvalFlowId,
          name: name,
          description: description,
          catalogId: catalogId,
          inputParams: [
            {
              type: type as "string" | "number" | "boolean",
              id: id,
              name: name,
              required: true,
            },
          ],
          approver: {
            approverType: approverType as "approvalFlow" | "resource",
            resourceTypeId: resourceTypeId,
          },
        },
      ])
    );
    const result = await listApprovalFlowInfo(listByCatalogIdSuccess, listInfoByCatalogIdSuccess)(catalogId);
    if (result.isErr()) {
      throw result.error;
    }

    const list = result.value;
    expect(listByCatalogIdSuccess.mock.calls.length).toBe(1);
    expect(listByCatalogIdSuccess.mock.calls[0][0]).toBe(catalogId);
    expect(listInfoByCatalogIdSuccess.mock.calls.length).toBe(1);
    expect(listInfoByCatalogIdSuccess.mock.calls[0][0]).toBe(catalogId);
    expect(result.isOk()).toBe(true);
    expect(list).toEqual([
      {
        id: approvalFlowId,
        catalogId: catalogId,
        ownerGroupId: ownerGroupId,
        approverGroupId: approvalGroupId,
        name: name,
        description: description,
        inputParams: [
          {
            type: type,
            id: id,
            name: name,
            required: true,
          },
        ],
        approver: {
          approverType: approverType,
          resourceTypeId: resourceTypeId,
        },
      },
    ]);
  });
});
