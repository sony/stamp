import { describe, it, expect, vi } from "vitest";
import { some } from "@stamp-lib/stamp-option";
import { okAsync } from "neverthrow";
import { getApprovalFlow, GetApprovalFlowInput } from "./get";

describe("Testing getApprovalFlow", () => {
  const ownerGroupId = "testOwnerGroupId";
  const approvalGroupId = "testApproverGroupId";
  const approvalFlowId = "testApprovalFlowId";
  const description = "description";
  const id = "id";
  const name = "name";
  const type = "string";
  const resourceTypeId = "resourceTypeId";
  const approverType = "approvalFlow";

  it("should return correct approval flow information when getApprovalFlow is called with valid input", async () => {
    const catalogId = "testCatalogId";
    const getApprovalFlowInfoSuccess = vi
      .fn()
      .mockReturnValue(
        okAsync(some({ id: "testApprovalFlowId", catalogId: "testCatalogId", ownerGroupId: "testOwnerGroupId", approverGroupId: "testApproverGroupId" }))
      );
    const getApprovalFlowInfoConfigSuccess = vi.fn().mockReturnValue(
      okAsync(
        some({
          id: approvalFlowId,
          name: name,
          description: description,
          catalogId: catalogId,
          inputParams: [
            {
              type: type as "string" | "number" | "boolean",
              id: id,
              name: "name",
              required: true,
            },
          ],
          approver: {
            approverType: approverType as "approvalFlow" | "resource",
            resourceTypeId: resourceTypeId,
          },
        })
      )
    );
    const input: GetApprovalFlowInput = {
      catalogId: catalogId,
      approvalFlowId: approvalFlowId,
    };
    const result = await getApprovalFlow(getApprovalFlowInfoSuccess, getApprovalFlowInfoConfigSuccess)(input);
    if (result.isErr()) {
      throw result.error;
    }

    const approvalFlowInfo = result.value;
    expect(getApprovalFlowInfoSuccess.mock.calls.length).toBe(1);
    expect(getApprovalFlowInfoSuccess.mock.calls[0][0]).toBe(catalogId);
    expect(getApprovalFlowInfoSuccess.mock.calls[0][1]).toBe(approvalFlowId);
    expect(getApprovalFlowInfoConfigSuccess.mock.calls.length).toBe(1);
    expect(getApprovalFlowInfoConfigSuccess.mock.calls[0][0]).toBe(catalogId);
    expect(getApprovalFlowInfoConfigSuccess.mock.calls[0][1]).toBe(approvalFlowId);
    expect(result.isOk()).toBe(true);
    expect(approvalFlowInfo).toStrictEqual(
      some({
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
      })
    );
  });
});
