import { none, some } from "@stamp-lib/stamp-option";
import { ApprovalFlowHandler } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ApprovalFlowDBProvider, ApprovalRequestDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { okAsync } from "neverthrow";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { rejectWorkflow, RejectWorkflowInput } from "./reject";

describe("rejectWorkflow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("rejectWorkflow", () => {
    it("should reject a pending approval request that approverType is approvalFlow", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn(),
        revoked: vi.fn(),
      };

      const getCatalogConfigProvider: CatalogConfigProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-catalog-id",
            name: "test-catalog",
            description: "catalogDescription",
            approvalFlows: [
              {
                id: "test-approval-flow-id",
                name: "testApprovalFlowName",
                description: "testApprovalFlowDescription",
                inputParams: [],
                handlers: testApprovalFlowHandler,
                inputResources: [],
                approver: { approverType: "approvalFlow" },
              },
            ],
            resourceTypes: [],
          })
        )
      );

      const getApprovalRequestById: ApprovalRequestDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
            requestDate: new Date().toISOString(),
            approvalFlowId: "test-approval-flow-id",
            requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
            approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
            inputParams: [{ id: "test-id", value: "test-value" }],
            inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
            status: "pending",
            catalogId: "test-catalog-id",
            approverType: "group",
            requestComment: "test request comment",
            validatedDate: new Date().toISOString(),
            validationHandlerResult: {
              isSuccess: true,
              message: "test validation success message",
            },
            approvedDate: new Date().toISOString(),
            approvedComment: "test approved comment",
          })
        )
      );

      const updateApprovalRequestStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"] = vi.fn().mockReturnValue(
        okAsync({
          userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
          requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
          requestDate: new Date().toISOString(),
          approvalFlowId: "test-approval-flow-id",
          requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
          approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
          inputParams: [{ id: "test-id", value: "test-value" }],
          inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
          status: "rejected",
          catalogId: "test-catalog-id",
          approverType: "group",
          requestComment: "test request comment",
          validatedDate: new Date().toISOString(),
          validationHandlerResult: {
            isSuccess: true,
            message: "test validation success message",
          },
          approvedDate: new Date().toISOString(),
          approvedComment: "test approved comment",
        })
      );

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-approval-flow-id",
            catalogId: "test-catalog-id",
            approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
          })
        )
      );

      const getResourceById: ResourceDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-resource-id",
            catalogId: "test-catalog-id",
            resourceTypeId: "test-resource-type-id",
            approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
          })
        )
      );

      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
            role: "owner",
            createdAt: "2021-09-01T00:00:00Z",
            updatedAt: "2021-09-01T00:00:00Z",
          })
        )
      );

      const workflow = rejectWorkflow({
        getCatalogConfigProvider,
        getApprovalRequestById,
        updateApprovalRequestStatusToRejected,
        getApprovalFlowById,
        getResourceById,
        getGroupMemberShip,
      });

      const input: RejectWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        rejectComment: "test reject comment",
        userIdWhoRejected: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("rejected");
      expect(getGroupMemberShip).toHaveBeenCalledWith({
        userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
      });
    });

    it("should return error if requester is not approver and approverType is approvalFlow", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn(),
        revoked: vi.fn(),
      };

      const getCatalogConfigProvider: CatalogConfigProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-catalog-id",
            name: "test-catalog",
            description: "catalogDescription",
            approvalFlows: [
              {
                id: "test-approval-flow-id",
                name: "testApprovalFlowName",
                description: "testApprovalFlowDescription",
                inputParams: [],
                handlers: testApprovalFlowHandler,
                inputResources: [],
                approver: { approverType: "approvalFlow" },
              },
            ],
            resourceTypes: [],
          })
        )
      );

      const getApprovalRequestById: ApprovalRequestDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
            requestDate: new Date().toISOString(),
            approvalFlowId: "test-approval-flow-id",
            requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
            approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
            inputParams: [{ id: "test-id", value: "test-value" }],
            inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
            status: "pending",
            catalogId: "test-catalog-id",
            approverType: "group",
            requestComment: "test request comment",
            validatedDate: new Date().toISOString(),
            validationHandlerResult: {
              isSuccess: true,
              message: "test validation success message",
            },
            approvedDate: new Date().toISOString(),
            approvedComment: "test approved comment",
          })
        )
      );

      const updateApprovalRequestStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"] = vi.fn().mockReturnValue(
        okAsync({
          userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
          requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
          requestDate: new Date().toISOString(),
          approvalFlowId: "test-approval-flow-id",
          requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
          approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
          inputParams: [{ id: "test-id", value: "test-value" }],
          inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
          status: "rejected",
          catalogId: "test-catalog-id",
          approverType: "group",
          requestComment: "test request comment",
          validatedDate: new Date().toISOString(),
          validationHandlerResult: {
            isSuccess: true,
            message: "test validation success message",
          },
          approvedDate: new Date().toISOString(),
          approvedComment: "test approved comment",
        })
      );

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-approval-flow-id",
            catalogId: "test-catalog-id",
            approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
          })
        )
      );

      const getResourceById: ResourceDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-resource-id",
            catalogId: "test-catalog-id",
            resourceTypeId: "test-resource-type-id",
            approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
          })
        )
      );

      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const workflow = rejectWorkflow({
        getCatalogConfigProvider,
        getApprovalRequestById,
        updateApprovalRequestStatusToRejected,
        getApprovalFlowById,
        getResourceById,
        getGroupMemberShip,
      });

      const input: RejectWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        rejectComment: "test reject comment",
        userIdWhoRejected: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Permission denied");
      expect(getGroupMemberShip).toHaveBeenCalledWith({
        userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
      });
    });

    it("should reject a pending approval request that approverType is resource", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn(),
        revoked: vi.fn(),
      };

      const getCatalogConfigProvider: CatalogConfigProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-catalog-id",
            name: "test-catalog",
            description: "catalogDescription",
            approvalFlows: [
              {
                id: "test-approval-flow-id",
                name: "testApprovalFlowName",
                description: "testApprovalFlowDescription",
                inputParams: [],
                handlers: testApprovalFlowHandler,
                inputResources: [
                  {
                    resourceTypeId: "test-resource-type-id",
                  },
                ],
                approver: { approverType: "resource", resourceTypeId: "test-resource-type-id" },
              },
            ],
            resourceTypes: [
              {
                id: "test-resource-type-id",
                name: "testResourceTypeName",
                description: "testResourceTypeDescription",
                createParams: [],
                infoParams: [],
                handlers: {},
                isCreatable: true,
                isUpdatable: true,
                isDeletable: true,
                ownerManagement: true,
                approverManagement: true,
              },
            ],
          })
        )
      );

      const getApprovalRequestById: ApprovalRequestDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
            requestDate: new Date().toISOString(),
            approvalFlowId: "test-approval-flow-id",
            requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
            approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
            inputParams: [{ id: "test-id", value: "test-value" }],
            inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
            status: "pending",
            catalogId: "test-catalog-id",
            approverType: "group",
            requestComment: "test request comment",
            validatedDate: new Date().toISOString(),
            validationHandlerResult: {
              isSuccess: true,
              message: "test validation success message",
            },
            approvedDate: new Date().toISOString(),
            approvedComment: "test approved comment",
          })
        )
      );

      const updateApprovalRequestStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"] = vi.fn().mockReturnValue(
        okAsync({
          userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
          requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
          requestDate: new Date().toISOString(),
          approvalFlowId: "test-approval-flow-id",
          requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
          approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
          inputParams: [{ id: "test-id", value: "test-value" }],
          inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
          status: "rejected",
          catalogId: "test-catalog-id",
          approverType: "group",
          requestComment: "test request comment",
          validatedDate: new Date().toISOString(),
          validationHandlerResult: {
            isSuccess: true,
            message: "test validation success message",
          },
          approvedDate: new Date().toISOString(),
          approvedComment: "test approved comment",
        })
      );

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn().mockReturnValue(okAsync(none));

      const getResourceById: ResourceDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-resource-id",
            catalogId: "test-catalog-id",
            resourceTypeId: "test-resource-type-id",
            approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
          })
        )
      );

      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
            role: "owner",
            createdAt: "2021-09-01T00:00:00Z",
            updatedAt: "2021-09-01T00:00:00Z",
          })
        )
      );

      const workflow = rejectWorkflow({
        getCatalogConfigProvider,
        getApprovalRequestById,
        updateApprovalRequestStatusToRejected,
        getApprovalFlowById,
        getResourceById,
        getGroupMemberShip,
      });

      const input: RejectWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        rejectComment: "test reject comment",
        userIdWhoRejected: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("rejected");
      expect(getGroupMemberShip).toHaveBeenCalledWith({
        userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
      });
    });

    it("should return error if requester is not approver and approverType is resource", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn(),
        revoked: vi.fn(),
      };

      const getCatalogConfigProvider: CatalogConfigProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-catalog-id",
            name: "test-catalog",
            description: "catalogDescription",
            approvalFlows: [
              {
                id: "test-approval-flow-id",
                name: "testApprovalFlowName",
                description: "testApprovalFlowDescription",
                inputParams: [],
                handlers: testApprovalFlowHandler,
                inputResources: [
                  {
                    resourceTypeId: "test-resource-type-id",
                  },
                ],
                approver: { approverType: "resource", resourceTypeId: "test-resource-type-id" },
              },
            ],
            resourceTypes: [
              {
                id: "test-resource-type-id",
                name: "testResourceTypeName",
                description: "testResourceTypeDescription",
                createParams: [],
                infoParams: [],
                handlers: {},
                isCreatable: true,
                isUpdatable: true,
                isDeletable: true,
                ownerManagement: true,
                approverManagement: true,
              },
            ],
          })
        )
      );

      const getApprovalRequestById: ApprovalRequestDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
            requestDate: new Date().toISOString(),
            approvalFlowId: "test-approval-flow-id",
            requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
            approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
            inputParams: [{ id: "test-id", value: "test-value" }],
            inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
            status: "pending",
            catalogId: "test-catalog-id",
            approverType: "group",
            requestComment: "test request comment",
            validatedDate: new Date().toISOString(),
            validationHandlerResult: {
              isSuccess: true,
              message: "test validation success message",
            },
            approvedDate: new Date().toISOString(),
            approvedComment: "test approved comment",
          })
        )
      );

      const updateApprovalRequestStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"] = vi.fn().mockReturnValue(
        okAsync({
          userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
          requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
          requestDate: new Date().toISOString(),
          approvalFlowId: "test-approval-flow-id",
          requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
          approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
          inputParams: [{ id: "test-id", value: "test-value" }],
          inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
          status: "rejected",
          catalogId: "test-catalog-id",
          approverType: "group",
          requestComment: "test request comment",
          validatedDate: new Date().toISOString(),
          validationHandlerResult: {
            isSuccess: true,
            message: "test validation success message",
          },
          approvedDate: new Date().toISOString(),
          approvedComment: "test approved comment",
        })
      );

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn().mockReturnValue(okAsync(none));

      const getResourceById: ResourceDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-resource-id",
            catalogId: "test-catalog-id",
            resourceTypeId: "test-resource-type-id",
            approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
          })
        )
      );

      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const workflow = rejectWorkflow({
        getCatalogConfigProvider,
        getApprovalRequestById,
        updateApprovalRequestStatusToRejected,
        getApprovalFlowById,
        getResourceById,
        getGroupMemberShip,
      });

      const input: RejectWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        rejectComment: "test reject comment",
        userIdWhoRejected: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Permission denied");
      expect(getGroupMemberShip).toHaveBeenCalledWith({
        userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
      });
    });

    it("should return error that target resource not found", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn(),
        revoked: vi.fn(),
      };

      const getCatalogConfigProvider: CatalogConfigProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-catalog-id",
            name: "test-catalog",
            description: "catalogDescription",
            approvalFlows: [
              {
                id: "test-approval-flow-id",
                name: "testApprovalFlowName",
                description: "testApprovalFlowDescription",
                inputParams: [],
                handlers: testApprovalFlowHandler,
                inputResources: [
                  {
                    resourceTypeId: "test-resource-type-id",
                  },
                ],
                approver: { approverType: "resource", resourceTypeId: "test-resource-type-id" },
              },
            ],
            resourceTypes: [
              {
                id: "test-resource-type-id",
                name: "testResourceTypeName",
                description: "testResourceTypeDescription",
                createParams: [],
                infoParams: [],
                handlers: {},
                isCreatable: true,
                isUpdatable: true,
                isDeletable: true,
                ownerManagement: true,
                approverManagement: true,
              },
            ],
          })
        )
      );

      const getApprovalRequestById: ApprovalRequestDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
            requestDate: new Date().toISOString(),
            approvalFlowId: "test-approval-flow-id",
            requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
            approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
            inputParams: [{ id: "test-id", value: "test-value" }],
            inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
            status: "pending",
            catalogId: "test-catalog-id",
            approverType: "group",
            requestComment: "test request comment",
            validatedDate: new Date().toISOString(),
            validationHandlerResult: {
              isSuccess: true,
              message: "test validation success message",
            },
            approvedDate: new Date().toISOString(),
            approvedComment: "test approved comment",
          })
        )
      );

      const updateApprovalRequestStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"] = vi.fn().mockReturnValue(
        okAsync({
          userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
          requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
          requestDate: new Date().toISOString(),
          approvalFlowId: "test-approval-flow-id",
          requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
          approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
          inputParams: [{ id: "test-id", value: "test-value" }],
          inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
          status: "rejected",
          catalogId: "test-catalog-id",
          approverType: "group",
          requestComment: "test request comment",
          validatedDate: new Date().toISOString(),
          validationHandlerResult: {
            isSuccess: true,
            message: "test validation success message",
          },
          approvedDate: new Date().toISOString(),
          approvedComment: "test approved comment",
        })
      );

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn().mockReturnValue(okAsync(none));

      const getResourceById: ResourceDBProvider["getById"] = vi.fn().mockReturnValue(okAsync(none));

      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
            role: "owner",
            createdAt: "2021-09-01T00:00:00Z",
            updatedAt: "2021-09-01T00:00:00Z",
          })
        )
      );

      const workflow = rejectWorkflow({
        getCatalogConfigProvider,
        getApprovalRequestById,
        updateApprovalRequestStatusToRejected,
        getApprovalFlowById,
        getResourceById,
        getGroupMemberShip,
      });

      const input: RejectWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        rejectComment: "test reject comment",
        userIdWhoRejected: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Resource not found");
    });

    it("should return error if approval request is not found", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn(),
        revoked: vi.fn(),
      };

      const getCatalogConfigProvider: CatalogConfigProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-catalog-id",
            name: "test-catalog",
            description: "catalogDescription",
            approvalFlows: [
              {
                id: "test-approval-flow-id",
                name: "testApprovalFlowName",
                description: "testApprovalFlowDescription",
                inputParams: [],
                handlers: testApprovalFlowHandler,
                inputResources: [
                  {
                    resourceTypeId: "test-resource-type-id",
                  },
                ],
                approver: { approverType: "resource", resourceTypeId: "test-resource-type-id" },
              },
            ],
            resourceTypes: [
              {
                id: "test-resource-type-id",
                name: "testResourceTypeName",
                description: "testResourceTypeDescription",
                createParams: [],
                infoParams: [],
                handlers: {},
                isCreatable: true,
                isUpdatable: true,
                isDeletable: true,
                ownerManagement: true,
                approverManagement: true,
              },
            ],
          })
        )
      );

      const getApprovalRequestById: ApprovalRequestDBProvider["getById"] = vi.fn().mockReturnValue(okAsync(none));

      const updateApprovalRequestStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"] = vi.fn();

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn();

      const getResourceById: ResourceDBProvider["getById"] = vi.fn();

      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn();

      const workflow = rejectWorkflow({
        getCatalogConfigProvider,
        getApprovalRequestById,
        updateApprovalRequestStatusToRejected,
        getApprovalFlowById,
        getResourceById,
        getGroupMemberShip,
      });

      const input: RejectWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        rejectComment: "test reject comment",
        userIdWhoRejected: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request not found");
    });

    it("should return error if approval request is not pending", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn(),
        revoked: vi.fn(),
      };

      const getCatalogConfigProvider: CatalogConfigProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "test-catalog-id",
            name: "test-catalog",
            description: "catalogDescription",
            approvalFlows: [
              {
                id: "test-approval-flow-id",
                name: "testApprovalFlowName",
                description: "testApprovalFlowDescription",
                inputParams: [],
                handlers: testApprovalFlowHandler,
                inputResources: [
                  {
                    resourceTypeId: "test-resource-type-id",
                  },
                ],
                approver: { approverType: "resource", resourceTypeId: "test-resource-type-id" },
              },
            ],
            resourceTypes: [
              {
                id: "test-resource-type-id",
                name: "testResourceTypeName",
                description: "testResourceTypeDescription",
                createParams: [],
                infoParams: [],
                handlers: {},
                isCreatable: true,
                isUpdatable: true,
                isDeletable: true,
                ownerManagement: true,
                approverManagement: true,
              },
            ],
          })
        )
      );

      const getApprovalRequestById: ApprovalRequestDBProvider["getById"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
            requestDate: new Date().toISOString(),
            approvalFlowId: "test-approval-flow-id",
            requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
            approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
            inputParams: [{ id: "test-id", value: "test-value" }],
            inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
            status: "approved",
            catalogId: "test-catalog-id",
            approverType: "group",
            requestComment: "test request comment",
            validatedDate: new Date().toISOString(),
            validationHandlerResult: {
              isSuccess: true,
              message: "test validation success message",
            },
            approvedDate: new Date().toISOString(),
            approvedComment: "test approved comment",
          })
        )
      );

      const updateApprovalRequestStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"] = vi.fn();

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn();

      const getResourceById: ResourceDBProvider["getById"] = vi.fn();

      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn();

      const workflow = rejectWorkflow({
        getCatalogConfigProvider,
        getApprovalRequestById,
        updateApprovalRequestStatusToRejected,
        getApprovalFlowById,
        getResourceById,
        getGroupMemberShip,
      });

      const input: RejectWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        rejectComment: "test reject comment",
        userIdWhoRejected: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request is not pending. Current status is approved");
    });
  });
});
