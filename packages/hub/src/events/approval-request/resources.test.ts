import { describe, expect, it } from "vitest";
import { inputResourcesOfApprovalRequest, resourcesOfApprovalRequest } from "./resources";

describe("resourcesOfApprovalRequest", () => {
  it("maps inputResources of a normal request", () => {
    const request = {
      catalogId: "cat",
      approvalFlowId: "flow",
      inputResources: [{ resourceTypeId: "t1", resourceId: "r1" }],
      inputParams: [{ id: "x", value: "y" }],
    };
    expect(resourcesOfApprovalRequest(request)).toEqual([{ catalogId: "cat", resourceTypeId: "t1", resourceId: "r1" }]);
    expect(inputResourcesOfApprovalRequest(request)).toEqual([{ catalogId: "cat", resourceTypeId: "t1", resourceId: "r1" }]);
  });

  it("recovers the target resource of a stamp-system/resource-update request from inputParams", () => {
    const request = {
      catalogId: "stamp-system",
      approvalFlowId: "resource-update",
      inputResources: [],
      inputParams: [
        { id: "catalogId", value: "cat" },
        { id: "resourceTypeId", value: "t1" },
        { id: "resourceId", value: "r1" },
        { id: "updateParams", value: "{}" },
      ],
    };
    expect(resourcesOfApprovalRequest(request)).toEqual([{ catalogId: "cat", resourceTypeId: "t1", resourceId: "r1" }]);
    // requester authorization only looks at inputResources
    expect(inputResourcesOfApprovalRequest(request)).toEqual([]);
  });

  it("ignores incomplete resource-update params", () => {
    const request = {
      catalogId: "stamp-system",
      approvalFlowId: "resource-update",
      inputResources: [],
      inputParams: [{ id: "catalogId", value: "cat" }],
    };
    expect(resourcesOfApprovalRequest(request)).toEqual([]);
  });
});
