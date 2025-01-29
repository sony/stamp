import { some } from "@stamp-lib/stamp-option";
import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { SetApprovalFlowInput, setApprovalFlowInfo } from "./set";

describe("Testing setApprovalFlowInfo", () => {
  const approvalGroupId = "testApproverGroupId";
  const approvalFlowId = "testApprovalFlowId";
  const description = "description";
  const id = "id";
  const name = "name";
  const type = "string";
  const resourceTypeId = "resourceTypeId";
  const approverType = "approvalFlow";
  it("should correctly set approval flow information when provided valid input and database operation is successful", async () => {
    const catalogId = "testCatalogId";
    const setApprovalFlowInfoSuccess = vi.fn().mockReturnValue(
      okAsync({
        id: approvalFlowId,
        catalogId: catalogId,
        approverGroupId: approvalGroupId,
      })
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
    const input: SetApprovalFlowInput = {
      catalogId: catalogId,
      approvalFlowId: approvalFlowId,
      approverGroupId: approvalGroupId,
    };
    const result = await setApprovalFlowInfo(setApprovalFlowInfoSuccess, getApprovalFlowInfoConfigSuccess)(input);
    if (result.isErr()) {
      throw result.error;
    }

    const approvalFlowInfo = result.value;
    expect(setApprovalFlowInfoSuccess.mock.calls.length).toBe(1);
    expect(setApprovalFlowInfoSuccess.mock.calls[0][0]).toStrictEqual({
      catalogId: catalogId,
      id: approvalFlowId,
      approverGroupId: approvalGroupId,
    });
    expect(getApprovalFlowInfoConfigSuccess.mock.calls.length).toBe(1);
    expect(getApprovalFlowInfoConfigSuccess.mock.calls[0][0]).toBe(catalogId);
    expect(getApprovalFlowInfoConfigSuccess.mock.calls[0][1]).toBe(approvalFlowId);
    expect(result.isOk()).toBe(true);
    expect(approvalFlowInfo).toStrictEqual({
      id: approvalFlowId,
      catalogId: catalogId,
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
    });
  });
});
