import { describe, it, vi, expect, afterEach } from "vitest";
import {
  checkCanApproveRequestForFlow,
  CheckCanApproveRequestForFlowInput,
  checkCanApproveRequestForResource,
  CheckCanApproveRequestForResourceInput,
} from "./approve";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { StampHubError } from "../../../error";
import { okAsync, errAsync, err, ok } from "neverthrow";
import { none, some } from "@stamp-lib/stamp-option";

describe("approve", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("CheckCanApproveRequestForFlow", () => {
    it("should return okAsync if user is in the approver group", async () => {
      const input: CheckCanApproveRequestForFlowInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
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
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(some({})));

      const result = await checkCanApproveRequestForFlow(getGroupMemberShipProvider)(input);
      expect(result).toEqual(ok(input));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });

    it("should return errAsync if user is not in the approver group", async () => {
      const input: CheckCanApproveRequestForFlowInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
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
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanApproveRequestForFlow(getGroupMemberShipProvider)(input);

      expect(result).toEqual(err(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN")));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });

    it("should return errAsync if approverType is not an approvalFlow", async () => {
      const input: CheckCanApproveRequestForFlowInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
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
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanApproveRequestForFlow(getGroupMemberShipProvider)(input);

      expect.assertions(2);
      if (result.isErr()) {
        expect(result.error.code).toEqual("INTERNAL_SERVER_ERROR");
      }

      expect(getGroupMemberShipProvider).not.toHaveBeenCalled();
    });

    it("should return errAsync if getGroupMemberShipProvider returns an error", async () => {
      const input: CheckCanApproveRequestForFlowInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
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
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(errAsync(new Error("test error")));

      const result = await checkCanApproveRequestForFlow(getGroupMemberShipProvider)(input);

      expect(result).toEqual(err(new StampHubError("test error", "test error", "INTERNAL_SERVER_ERROR")));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });
  });

  describe("CheckCanApproveRequestForResource", () => {
    it("should return okAsync if user is in the approver group", async () => {
      const input: CheckCanApproveRequestForResourceInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
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
        resourceOnDB: {
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
          id: "test-resource",
          catalogId: "test-catalog",
          resourceTypeId: "test-resource-type",
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(some({})));

      const result = await checkCanApproveRequestForResource(getGroupMemberShipProvider)(input);

      expect(result).toEqual(ok(input));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });

    it("should return errAsync if user is not in the approver group", async () => {
      const input: CheckCanApproveRequestForResourceInput = {
        userIdWhoApproved: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random uuid
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
        resourceOnDB: {
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
          id: "test-resource",
          catalogId: "test-catalog",
          resourceTypeId: "test-resource-type",
        },
        catalogId: "test-catalog-id",
        approvalFlowId: "test-flow-id",
      };

      const getGroupMemberShipProvider: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanApproveRequestForResource(getGroupMemberShipProvider)(input);

      expect(result).toEqual(err(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN")));
      expect(getGroupMemberShipProvider).toHaveBeenCalledWith({
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
        userId: "05bf84b9-f92b-4312-a1e4-9557ad854054",
      });
    });
  });
});
