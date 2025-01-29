import { describe, it, expect } from "vitest";
import { validateApprovalFlowId, ValidateApprovalFlowIdInput } from "./validation";
import { StampHubError } from "../../error";
import { err } from "neverthrow";
import { ApprovalFlowHandler, HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";

const testApprovalFlowHandler: ApprovalFlowHandler = {
  approvalRequestValidation: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  approved: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  revoked: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
};

describe("validateApprovalFlowId", () => {
  it("should return input when approval flow is found", async () => {
    const input: ValidateApprovalFlowIdInput = {
      catalogConfig: {
        id: "testCatalogId",
        name: "testCatalogName",
        description: "testCatalogDescription",
        approvalFlows: [
          {
            id: "testApprovalFlowId",
            name: "testApprovalFlowName",
            description: "testApprovalFlowDescription",
            inputParams: [],
            handlers: testApprovalFlowHandler,
            inputResources: [],
            approver: { approverType: "approvalFlow" },
          },
        ],
        resourceTypes: [],
      },
      approvalFlowId: "testApprovalFlowId",
    };

    const result = await validateApprovalFlowId(input);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(input);
  });

  it("should return error when approval flow is not found", async () => {
    const input: ValidateApprovalFlowIdInput = {
      catalogConfig: {
        id: "testCatalogId",
        name: "testCatalogName",
        description: "testCatalogDescription",
        approvalFlows: [],
        resourceTypes: [],
      },
      approvalFlowId: "testApprovalFlowId",
    };

    const result = await validateApprovalFlowId(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StampHubError);
  });

  it("should return error when approvalFlowId is empty", async () => {
    const input: ValidateApprovalFlowIdInput = {
      catalogConfig: {
        id: "testCatalogId",
        name: "testCatalogName",
        description: "testCatalogDescription",
        approvalFlows: [
          {
            id: "testApprovalFlowId",
            name: "testApprovalFlowName",
            description: "testApprovalFlowDescription",
            inputParams: [],
            handlers: testApprovalFlowHandler,
            inputResources: [],
            approver: { approverType: "approvalFlow" },
          },
        ],
        resourceTypes: [],
      },
      approvalFlowId: "",
    };

    const result = await validateApprovalFlowId(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StampHubError);
  });
});
