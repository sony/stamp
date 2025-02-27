import { describe, it, vi, expect, afterEach } from "vitest";
import {
  checkCanRevokeRequestForFlow,
  CheckCanRevokeRequestForFlowInput,
  checkCanRevokeRequestForResource,
  CheckCanRevokeRequestForResourceInput,
} from "./revoke";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { StampHubError } from "../../../error";
import { okAsync, errAsync, err, ok } from "neverthrow";
import { none, some } from "@stamp-lib/stamp-option";

describe("revoke", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("CheckCanRevokeRequestForFlow", () => {
    it("should return okAsync if user is in the approver group", async () => {
      const input: CheckCanRevokeRequestForFlowInput = {
        userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "approvalFlow",
          },
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
        requestUserId: "9165dcd4-e165-42c4-a1c1-cfd53cf2ca4c", // random uuid
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(some({})));

      const result = await checkCanRevokeRequestForFlow(getGroupMemberShipProvider)(input);
      expect(result).toEqual(ok(input));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });
  });

  it("should return okAsync if user is the request user", async () => {
    const input: CheckCanRevokeRequestForFlowInput = {
      userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
      approvalFlowInfo: {
        approver: {
          approverType: "approvalFlow",
        },
        approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        description: "test-flow",
        id: "test-flow-id",
        name: "test-flow",
        catalogId: "test-catalog-id",
        inputParams: [],
      },
      catalogId: "test-catalog-id",
      approvalFlowId: "test-flow-id",
      requestUserId: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
    };

    const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

    const result = await checkCanRevokeRequestForFlow(getGroupMemberShipProvider)(input);
    expect(result).toEqual(ok(input));
    expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
  });

  it("should return okAsync if requestUserId is system", async () => {
    const input: CheckCanRevokeRequestForFlowInput = {
      userIdWhoRevoked: "system",
      approvalFlowInfo: {
        approver: {
          approverType: "approvalFlow",
        },
        approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        description: "test-flow",
        id: "test-flow-id",
        name: "test-flow",
        catalogId: "test-catalog-id",
        inputParams: [],
      },
      catalogId: "test-catalog-id",
      approvalFlowId: "test-flow-id",
      requestUserId: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
    };

    const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

    const result = await checkCanRevokeRequestForFlow(getGroupMemberShipProvider)(input);
    expect(result).toEqual(ok(input));
    expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
  });

  it("should return errAsync if user is neither requestUser nor in the approver group", async () => {
    const input: CheckCanRevokeRequestForFlowInput = {
      userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
      approvalFlowInfo: {
        approver: {
          approverType: "approvalFlow",
        },
        approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        description: "test-flow",
        id: "test-flow-id",
        name: "test-flow",
        catalogId: "test-catalog-id",
        inputParams: [],
      },
      catalogId: "test-catalog-id",
      approvalFlowId: "test-flow-id",
      requestUserId: "9165dcd4-e165-42c4-a1c1-cfd53cf2ca4c", // random uuid
    };

    const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

    const result = await checkCanRevokeRequestForFlow(getGroupMemberShipProvider)(input);
    expect(result).toEqual(err(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN")));
    expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
      groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
      userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
    });
  });

  it("should return errAsync if approverType is not an approvalFlow", async () => {
    const input: CheckCanRevokeRequestForFlowInput = {
      userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
      approvalFlowInfo: {
        approver: {
          approverType: "resource",
          resourceTypeId: "test-resource-type",
        },
        approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        description: "test-flow",
        id: "test-flow-id",
        name: "test-flow",
        catalogId: "test-catalog-id",
        inputParams: [],
      },
      catalogId: "test-catalog-id",
      approvalFlowId: "test-flow-id",
      requestUserId: "9165dcd4-e165-42c4-a1c1-cfd53cf2ca4c", // random uuid
    };

    const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

    const result = await checkCanRevokeRequestForFlow(getGroupMemberShipProvider)(input);
    expect.assertions(2);
    if (result.isErr()) {
      expect(result.error.code).toEqual("INTERNAL_SERVER_ERROR");
    }
    expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
  });

  it("should return errAsync if getGroupMemberShipProvider returns an error", async () => {
    const input: CheckCanRevokeRequestForFlowInput = {
      userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
      approvalFlowInfo: {
        approver: {
          approverType: "approvalFlow",
        },
        approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        description: "test-flow",
        id: "test-flow-id",
        name: "test-flow",
        catalogId: "test-catalog-id",
        inputParams: [],
      },
      catalogId: "test-catalog-id",
      approvalFlowId: "test-flow-id",
      requestUserId: "9165dcd4-e165-42c4-a1c1-cfd53cf2ca4c", // random uuid
    };

    const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(errAsync(new Error("error")));

    const result = await checkCanRevokeRequestForFlow(getGroupMemberShipProvider)(input);
    expect(result.isErr()).toBeTruthy();
    expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
      groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
      userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
    });
  });

  describe("CheckCanRevokeRequestForResource", () => {
    it("should return okAsync if user is in the approver group", async () => {
      const input: CheckCanRevokeRequestForResourceInput = {
        userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "resource",
            resourceTypeId: "test-resource-type",
          },
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
        requestUserId: "9165dcd4-e165-42c4-a1c1-cfd53cf2ca4c", // random uuid
        resourceOnDB: {
          id: "test-resource-id",
          catalogId: "test-catalog-id",
          resourceTypeId: "test-resource-type",
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        },
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(some({})));

      const result = await checkCanRevokeRequestForResource(getGroupMemberShipProvider)(input);
      expect(result).toEqual(ok(input));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });
    it("should return okAsync if user is the request user", async () => {
      const input: CheckCanRevokeRequestForResourceInput = {
        userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "resource",
            resourceTypeId: "test-resource-type",
          },
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
        requestUserId: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        resourceOnDB: {
          id: "test-resource-id",
          catalogId: "test-catalog-id",
          resourceTypeId: "test-resource-type",
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        },
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanRevokeRequestForResource(getGroupMemberShipProvider)(input);
      expect(result).toEqual(ok(input));
      expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
    });

    it("should return okAsync if requestUserId is system", async () => {
      const input: CheckCanRevokeRequestForResourceInput = {
        userIdWhoRevoked: "system",
        approvalFlowInfo: {
          approver: {
            approverType: "resource",
            resourceTypeId: "test-resource-type",
          },
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
        requestUserId: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        resourceOnDB: {
          id: "test-resource-id",
          catalogId: "test-catalog-id",
          resourceTypeId: "test-resource-type",
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        },
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanRevokeRequestForResource(getGroupMemberShipProvider)(input);
      expect(result).toEqual(ok(input));
      expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
    });

    it("should return errAsync if user is neither requestUser nor in the approver group", async () => {
      const input: CheckCanRevokeRequestForResourceInput = {
        userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "resource",
            resourceTypeId: "test-resource-type",
          },
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
        requestUserId: "9165dcd4-e165-42c4-a1c1-cfd53cf2ca4c", // random uuid
        resourceOnDB: {
          id: "test-resource-id",
          catalogId: "test-catalog-id",
          resourceTypeId: "test-resource-type",
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        },
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanRevokeRequestForResource(getGroupMemberShipProvider)(input);
      expect(result).toEqual(err(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN")));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });

    it("should return errAsync if approverType is not a resource", async () => {
      const input: CheckCanRevokeRequestForResourceInput = {
        userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "approvalFlow",
          },
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
        requestUserId: "9165dcd4-e165-42c4-a1c1-cfd53cf2ca4c", // random uuid
        resourceOnDB: {
          id: "test-resource-id",
          catalogId: "test-catalog-id",
          resourceTypeId: "test-resource-type",
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        },
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanRevokeRequestForResource(getGroupMemberShipProvider)(input);
      expect.assertions(2);
      if (result.isErr()) {
        expect(result.error.code).toEqual("INTERNAL_SERVER_ERROR");
      }
      expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
    });

    it("should return errAsync if getGroupMemberShipProvider returns an error", async () => {
      const input: CheckCanRevokeRequestForResourceInput = {
        userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
        approvalFlowInfo: {
          approver: {
            approverType: "resource",
            resourceTypeId: "test-resource-type",
          },
          description: "test-flow",
          id: "test-flow-id",
          name: "test-flow",
          catalogId: "test-catalog-id",
          inputParams: [],
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
        requestUserId: "9165dcd4-e165-42c4-a1c1-cfd53cf2ca4c", // random uuid
        resourceOnDB: {
          id: "test-resource-id",
          catalogId: "test-catalog-id",
          resourceTypeId: "test-resource-type",
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        },
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(errAsync(new Error("error")));

      const result = await checkCanRevokeRequestForResource(getGroupMemberShipProvider)(input);
      expect(result.isErr()).toBeTruthy();
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });
  });
});
