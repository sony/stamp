import { describe, expect, it } from "vitest";
import { getApprovalFlowConfig, GetApprovalFlowConfigInput } from "./approvalFlowConfig";
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

describe("getApprovalFlowConfig", () => {
  it("should return approval flow config when approval flow is found", async () => {
    const input: GetApprovalFlowConfigInput = {
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

    const result = await getApprovalFlowConfig(input);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      ...input,
      approvalFlowConfig: input.catalogConfig.approvalFlows[0],
    });
  });

  it("should return error when approval flow is not found", async () => {
    const input: GetApprovalFlowConfigInput = {
      catalogConfig: {
        id: "testCatalogId",
        name: "testCatalogName",
        description: "testCatalogDescription",
        approvalFlows: [],
        resourceTypes: [],
      },
      approvalFlowId: "testApprovalFlowId",
    };

    const result = await getApprovalFlowConfig(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StampHubError);
  });

  it("should return error when approvalFlowId is empty", async () => {
    const input: GetApprovalFlowConfigInput = {
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

    const result = await getApprovalFlowConfig(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StampHubError);
  });
});
