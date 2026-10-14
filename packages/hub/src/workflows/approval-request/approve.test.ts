import { none, some } from "@stamp-lib/stamp-option";
import { ApprovalFlowHandler } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";

import { ApprovalFlowDBProvider, ApprovalRequestDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ok, okAsync } from "neverthrow";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { approveWorkflow, ApproveWorkflowInput } from "./approve";
import { createLogger } from "@stamp-lib/stamp-logger";

const logger = createLogger("DEBUG", { moduleName: "unit-test" });

describe("approveWorkflow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("approveWorkflow", () => {
    it("should approve a pending approval request that approverType is approvalFlow", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
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

      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi.fn().mockReturnValue(
        okAsync({
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
      );

      const setApprovalRequest: ApprovalRequestDBProvider["set"] = vi.fn().mockImplementation((input) => okAsync(input));

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

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
        },
        logger
      );

      const input: ApproveWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "test approved comment",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("approvedActionSucceeded");
      expect(getGroupMemberShip).toHaveBeenCalledWith({
        userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
      });
    });

    it("should return error if requester is not approver and approverType is approvalFlow", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
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

      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi.fn().mockReturnValue(
        okAsync({
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
      );

      const setApprovalRequest: ApprovalRequestDBProvider["set"] = vi.fn().mockImplementation((input) => okAsync(input));

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

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
        },
        logger
      );

      const input: ApproveWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "test approved comment",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Permission denied");
      expect(getGroupMemberShip).toHaveBeenCalledWith({
        userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
      });
    });

    it("should approve a pending approval request that approverType is resource", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
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

      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi.fn().mockReturnValue(
        okAsync({
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
      );

      const setApprovalRequest: ApprovalRequestDBProvider["set"] = vi.fn().mockImplementation((input) => okAsync(input));

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

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
        },
        logger
      );

      const input: ApproveWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "test approved comment",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("approvedActionSucceeded");
      expect(getGroupMemberShip).toHaveBeenCalledWith({
        userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        groupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
      });
    });

    it("should return error that requester is not approver and approverType is resource", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
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

      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi.fn().mockReturnValue(
        okAsync({
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
      );

      const setApprovalRequest: ApprovalRequestDBProvider["set"] = vi.fn().mockImplementation((input) => okAsync(input));

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

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
        },
        logger
      );

      const input: ApproveWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "test approved comment",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
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
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
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

      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi.fn().mockReturnValue(
        okAsync({
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
      );

      const setApprovalRequest: ApprovalRequestDBProvider["set"] = vi.fn().mockImplementation((input) => okAsync(input));

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

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
        },
        logger
      );

      const input: ApproveWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "test approved comment",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Resource not found");
    });

    it("should return error if approval request is not found", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
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

      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi.fn();

      const setApprovalRequest: ApprovalRequestDBProvider["set"] = vi.fn();

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn();

      const getResourceById: ResourceDBProvider["getById"] = vi.fn();

      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn();

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
        },
        logger
      );

      const input: ApproveWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "test approved comment",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request not found");
    });

    it("should return error if approval request is not pending", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
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

      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi.fn();

      const setApprovalRequest: ApprovalRequestDBProvider["set"] = vi.fn();

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn();

      const getResourceById: ResourceDBProvider["getById"] = vi.fn();

      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn();

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
        },
        logger
      );

      const input: ApproveWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "test approved comment",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Approval request is not pending. Current status is approved");
    });

    it("should create scheduler event when autoRevokeDuration is set", async () => {
      const testApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
        revoked: vi.fn(),
      };
      const getCatalogConfigProvider = vi.fn().mockReturnValue(
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
      // Updated approvalRequest using consistent uuid values.
      const approvalRequest = {
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        requestDate: new Date().toISOString(),
        approvalFlowId: "test-approval-flow-id",
        requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
        approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
        inputParams: [{ id: "test-id", value: "test-value" }],
        inputResources: [],
        status: "pending",
        catalogId: "test-catalog-id",
        approverType: "group",
        requestComment: "test request comment",
        validatedDate: new Date().toISOString(),
        validationHandlerResult: { isSuccess: true, message: "test validation success message" },
        approvedDate: "",
        approvedComment: "",
        autoRevokeDuration: "PT1H",
      };
      const getApprovalRequestById = vi.fn().mockReturnValue(okAsync(some(approvalRequest)));
      const updateApprovalRequestStatusToApproved = vi.fn().mockReturnValue(
        okAsync({
          ...approvalRequest,
          status: "approved",
          approvedDate: new Date().toISOString(),
          approvedComment: "approved",
          autoRevokeDuration: "PT1H",
        })
      );
      const setApprovalRequest = vi.fn().mockImplementation((input) => okAsync(input));
      const getApprovalFlowById = vi
        .fn()
        .mockReturnValue(okAsync(some({ id: "test-approval-flow-id", catalogId: "test-catalog-id", approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f" })));
      const getResourceById = vi.fn();
      const getGroupMemberShip = vi.fn().mockReturnValue(
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
      const createSchedulerEvent = vi.fn().mockReturnValue(okAsync({ id: "scheduler-event-id" }));

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
          createSchedulerEvent,
        },
        logger
      );

      const input = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "approved",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      console.log(result);
      expect(result.isOk()).toBe(true);

      expect(createSchedulerEvent).toHaveBeenCalled();
      expect(result._unsafeUnwrap().status).toBe("approvedActionSucceeded");
    });

    it("should return error if autoRevokeDuration is set but scheduler service is not available", async () => {
      const testApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
        revoked: vi.fn(),
      };
      const getCatalogConfigProvider = vi.fn().mockReturnValue(
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
      const approvalRequest = {
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        requestDate: new Date().toISOString(),
        approvalFlowId: "test-approval-flow-id",
        requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
        approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
        inputParams: [{ id: "test-id", value: "test-value" }],
        inputResources: [],
        status: "pending",
        catalogId: "test-catalog-id",
        approverType: "approvalFlow",
        requestComment: "test request comment",
        validatedDate: new Date().toISOString(),
        validationHandlerResult: { isSuccess: true, message: "test validation success message" },
        approvedDate: "",
        approvedComment: "",
        autoRevokeDuration: "PT1H",
      };
      const getApprovalRequestById = vi.fn().mockReturnValue(okAsync(some(approvalRequest)));
      const updateApprovalRequestStatusToApproved = vi.fn().mockReturnValue(
        okAsync({
          ...approvalRequest,
          status: "approved",
          approvedDate: new Date().toISOString(),
          approvedComment: "approved",
          autoRevokeDuration: "PT1H",
        })
      );
      const setApprovalRequest = vi.fn().mockImplementation((input) => okAsync(input));
      const getApprovalFlowById = vi
        .fn()
        .mockReturnValue(okAsync(some({ id: "test-approval-flow-id", catalogId: "test-catalog-id", approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f" })));
      const getResourceById = vi.fn();
      const getGroupMemberShip = vi.fn().mockReturnValue(
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
      // Omit createSchedulerEvent to simulate the scheduler service not being available.
      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
          // createSchedulerEvent is missing
        },
        logger
      );

      const input = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "approved",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Request has autoRevokeDuration property but scheduler service is not available");
    });
  });

  describe("approveWorkflow that approverType is requestSpecified", () => {
    it("should approve a pending approval request that approverType is requestSpecified", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
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
                approver: { approverType: "requestSpecified" },
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
            approverId: "8204a484-c5da-4648-810a-c095e2d473a3",
            inputParams: [],
            inputResources: [],
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

      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi.fn().mockReturnValue(
        okAsync({
          userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
          requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
          requestDate: new Date().toISOString(),
          approvalFlowId: "test-approval-flow-id",
          requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
          approverId: "8204a484-c5da-4648-810a-c095e2d473a3",
          inputParams: [],
          inputResources: [],
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
      );

      const setApprovalRequest: ApprovalRequestDBProvider["set"] = vi.fn().mockImplementation((input) => okAsync(input));

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn().mockReturnValue(okAsync(none));
      const getResourceById: ResourceDBProvider["getById"] = vi.fn();
      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(
        okAsync(
          some({
            userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
            groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
            role: "owner",
            createdAt: "2021-09-01T00:00:00Z",
            updatedAt: "2021-09-01T00:00:00Z",
          })
        )
      );

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
        },
        logger
      );

      const input: ApproveWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "test approved comment",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().status).toBe("approvedActionSucceeded");
      expect(getGroupMemberShip).toHaveBeenCalledWith({
        userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
      });
    });

    it("should return error if requester is not approver and approverType is requestSpecified", async () => {
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
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
                approver: { approverType: "requestSpecified" },
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
            approverId: "8204a484-c5da-4648-810a-c095e2d473a3",
            inputParams: [],
            inputResources: [],
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

      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi.fn().mockReturnValue(
        okAsync({
          userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
          requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
          requestDate: new Date().toISOString(),
          approvalFlowId: "test-approval-flow-id",
          requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
          approverId: "8204a484-c5da-4648-810a-c095e2d473a3",
          inputParams: [],
          inputResources: [],
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
      );

      const setApprovalRequest: ApprovalRequestDBProvider["set"] = vi.fn().mockImplementation((input) => okAsync(input));

      const getApprovalFlowById: ApprovalFlowDBProvider["getById"] = vi.fn().mockReturnValue(okAsync(none));
      const getResourceById: ResourceDBProvider["getById"] = vi.fn();
      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn().mockReturnValue(okAsync(none));

      const workflow = approveWorkflow(
        {
          getCatalogConfigProvider,
          getApprovalRequestById,
          updateApprovalRequestStatusToApproved,
          setApprovalRequest,
          getApprovalFlowById,
          getResourceById,
          getGroupMemberShip,
        },
        logger
      );

      const input: ApproveWorkflowInput = {
        approvalRequestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
        approvedComment: "test approved comment",
        userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
      };

      const result = await workflow(input);
      expect(result.isOk()).toBe(false);
      expect(result._unsafeUnwrapErr().message).toBe("Permission denied");
      expect(getGroupMemberShip).toHaveBeenCalledWith({
        userId: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
        groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
      });
    });
  });
  describe("requester re-check", () => {
    const requesterGroupId = "1f10d463-a2fe-c407-2b95-05b561346c8b";
    const approverGroupId = "18578bed-c45d-4f67-b9f7-10daf4c85f3f";
    const requestUserId = "dbf33b00-8a5f-e045-4aa1-2d943cb659b6";
    const userIdWhoApproved = "13f6d758-cea9-bfab-ffaf-9e012ddacf47";
    const pendingRequest = {
      requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
      requestDate: new Date().toISOString(),
      approvalFlowId: "test-approval-flow-id",
      requestUserId,
      approverId: approverGroupId,
      inputParams: [],
      inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
      status: "pending",
      catalogId: "test-catalog-id",
      approverType: "group",
      requestComment: "test request comment",
      validatedDate: new Date().toISOString(),
      validationHandlerResult: { isSuccess: true, message: "ok" },
    };
    const buildProviders = (requesterStillMember: boolean) => {
      // Created per test because the outer beforeEach resets all mocks.
      const testApprovalFlowHandler: ApprovalFlowHandler = {
        approvalRequestValidation: vi.fn(),
        approved: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approved Actions Succeeded" })),
        revoked: vi.fn(),
      };
      const getGroupMemberShip: GroupMemberShipProvider["get"] = vi.fn().mockImplementation(({ groupId, userId }) => {
        if (groupId === approverGroupId && userId === userIdWhoApproved) {
          return okAsync(some({ groupId, userId, role: "owner", createdAt: "", updatedAt: "" }));
        }
        if (groupId === requesterGroupId && userId === requestUserId && requesterStillMember) {
          return okAsync(some({ groupId, userId, role: "member", createdAt: "", updatedAt: "" }));
        }
        return okAsync(none);
      });
      const updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"] = vi
        .fn()
        .mockReturnValue(okAsync({ ...pendingRequest, status: "approved", approvedDate: new Date().toISOString(), userIdWhoApproved, approvedComment: "c" }));
      return {
        getCatalogConfigProvider: vi.fn().mockReturnValue(
          okAsync(
            some({
              id: "test-catalog-id",
              name: "test-catalog",
              description: "catalogDescription",
              approvalFlows: [
                {
                  id: "test-approval-flow-id",
                  name: "n",
                  description: "d",
                  inputParams: [],
                  handlers: testApprovalFlowHandler,
                  inputResources: [],
                  approver: { approverType: "approvalFlow" },
                },
              ],
              resourceTypes: [],
            })
          )
        ) as CatalogConfigProvider["get"],
        getApprovalRequestById: vi.fn().mockReturnValue(okAsync(some(pendingRequest))) as ApprovalRequestDBProvider["getById"],
        updateApprovalRequestStatusToApproved,
        setApprovalRequest: vi.fn().mockImplementation((input) => okAsync(input)) as ApprovalRequestDBProvider["set"],
        getApprovalFlowById: vi
          .fn()
          .mockReturnValue(okAsync(some({ id: "test-approval-flow-id", catalogId: "test-catalog-id", approverGroupId }))) as ApprovalFlowDBProvider["getById"],
        getResourceById: vi
          .fn()
          .mockReturnValue(
            okAsync(some({ id: "test-resource-id", catalogId: "test-catalog-id", resourceTypeId: "test-resource-type-id", requesterGroupIds: [requesterGroupId] }))
          ) as ResourceDBProvider["getById"],
        getGroupMemberShip,
      };
    };
    const input: ApproveWorkflowInput = { approvalRequestId: pendingRequest.requestId, approvedComment: "c", userIdWhoApproved };

    it("rejects approval with BAD_REQUEST when the requester is no longer in requesterGroupIds", async () => {
      const providers = buildProviders(false);
      const result = await approveWorkflow(providers, logger)(input);
      const error = result._unsafeUnwrapErr();
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.userMessage).toContain("no longer allowed");
      expect(providers.updateApprovalRequestStatusToApproved).not.toHaveBeenCalled();
    });

    it("approves when the requester is still a member", async () => {
      const providers = buildProviders(true);
      const result = await approveWorkflow(providers, logger)(input);
      expect(result._unsafeUnwrap().status).toBe("approvedActionSucceeded");
      expect(providers.updateApprovalRequestStatusToApproved).toHaveBeenCalledTimes(1);
    });
  });
});
