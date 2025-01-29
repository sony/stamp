import { some } from "@stamp-lib/stamp-option";
import { ApprovalFlowHandler, HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { ApprovalFlowDBProvider, ApprovalRequestDBProvider, DBError, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider, IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { err, ok, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { RevokeWorkflowInput, revokeWorkflow } from "./revoke";

const testApprovalFlowHandler: ApprovalFlowHandler = {
  approvalRequestValidation: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  approved: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  revoked: vi.fn().mockResolvedValue(
    ok({
      isSuccess: true,
      message: "test success message",
    })
  ),
};

describe("revokeWorkflow", () => {
  const input: RevokeWorkflowInput = {
    approvalRequestId: "80ad2471-1326-a98e-ea2f-fc8146d09019",
    revokedComment: "test revoked comment",
    userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054",
  };

  const catalogConfig: CatalogConfig = {
    id: "testCatalogId",
    name: "testCatalogName",
    description: "testCatalogDescription",
    approvalFlows: [],
    resourceTypes: [],
  };

  const approvalRequestDBProvider: ApprovalRequestDBProvider = {
    getById: vi.fn().mockReturnValue(
      okAsync(
        some({
          status: "approved",
          catalogId: "test-catalog-id-request",
          inputParams: [
            {
              value: "test-value",
              id: "test-id",
            },
          ],
          approverType: "group",
          inputResources: [
            {
              resourceTypeId: "test-resource-type-id",
              resourceId: "test-resource-id",
            },
          ],
          requestId: "526f66ea-17fe-14f3-e0cc-d02cdceb7abc", // random uuid
          approvalFlowId: "testApprovalFlowId",
          requestUserId: "27e29081-eeb5-4cd1-95a9-6352a9269e1a", // random uuid
          approverId: "2ac53bbf-d560-4c69-8ebb-9c252a0eaa8e", // random uuid
          requestDate: new Date().toISOString(),
          requestComment: "test request comment",
          approvedComment: "test approved comment",
          userIdWhoApproved: "bc430b4e-9edd-dfdb-82fd-372b7b5ba403", // random uuid
          validatedDate: new Date().toISOString(),
          validationHandlerResult: {
            isSuccess: true,
            message: "test validation success message",
          },
          approvedDate: new Date().toISOString(),
          approvedHandlerResult: {
            isSuccess: true,
            message: "test approval success message",
          },
        })
      )
    ),
    set: vi.fn().mockReturnValue(okAsync(some({}))),
    listByApprovalFlowId: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    listByRequestUserId: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    listByApproverId: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    updateStatusToApproved: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    updateStatusToRejected: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    updateStatusToRevoked: vi.fn().mockReturnValue(
      okAsync({
        status: "revoked",
        catalogId: "test-catalog-id-request",
        inputParams: [
          {
            value: "test-value",
            id: "test-id",
          },
        ],
        approverType: "group",
        inputResources: [
          {
            resourceTypeId: "test-resource-type-id",
            resourceId: "test-resource-id",
          },
        ],
        requestId: "526f66ea-17fe-14f3-e0cc-d02cdceb7abc", // random uuid
        approvalFlowId: "testApprovalFlowId",
        requestUserId: "27e29081-eeb5-4cd1-95a9-6352a9269e1a", // random uuid
        approverId: "2ac53bbf-d560-4c69-8ebb-9c252a0eaa8e", // random uuid
        requestDate: new Date().toISOString(),
        requestComment: "test request comment",
        approvedComment: "test approved comment",
        userIdWhoApproved: "bc430b4e-9edd-dfdb-82fd-372b7b5ba403", // random uuid
        validatedDate: new Date().toISOString(),
        validationHandlerResult: {
          isSuccess: true,
          message: "test validation success message",
        },
        approvedDate: new Date().toISOString(),
        approvedHandlerResult: {
          isSuccess: true,
          message: "test approval success message",
        },
        revokedDate: new Date().toISOString(),
        revokedComment: "test revoked comment",
        userIdWhoRevoked: "05bf84b9-f92b-4312-a1e4-9557ad854054", // random
      })
    ),
  };

  const approvalFlowDBProvider: ApprovalFlowDBProvider = {
    getById: vi.fn().mockReturnValue(
      okAsync(
        some({
          status: "approved",
          catalogId: "test-catalog-id-request",
          approverGroupId: "8204a484-c5da-4648-810a-c095e2d473a3", // random uuid
        })
      )
    ),
    set: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    listByCatalogId: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    delete: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  };

  const resourceDBProvider: ResourceDBProvider = {
    getById: vi.fn().mockReturnValue(okAsync(some({}))),
    set: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    delete: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    createAuditNotification: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    updateAuditNotification: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    deleteAuditNotification: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  };

  const groupMemberShipProvider: GroupMemberShipProvider = {
    get: vi.fn().mockReturnValue(okAsync(some({}))),
    listByGroup: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    listByUser: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    create: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    delete: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    update: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    count: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
  };

  it("Successful because enableRevoke is true", async () => {
    const successCatalogConfig: CatalogConfig = {
      ...catalogConfig,
      approvalFlows: [
        {
          id: "testApprovalFlowId",
          name: "testApprovalFlowName",
          description: "testApprovalFlowDescription",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
          enableRevoke: true,
        },
      ],
    };

    const getCatalogConfigProvider: CatalogConfigProvider["get"] = () => {
      return okAsync(some(successCatalogConfig));
    };

    const result = await revokeWorkflow(
      input,
      getCatalogConfigProvider,
      approvalRequestDBProvider,
      approvalFlowDBProvider,
      resourceDBProvider,
      groupMemberShipProvider
    );

    if (result.isErr()) {
      throw result.error;
    }
    expect(result.isOk()).toBe(true);
  });

  it("Failure because enableRevoke is false", async () => {
    const failureCatalogConfig: CatalogConfig = {
      ...catalogConfig,
      approvalFlows: [
        {
          id: "testApprovalFlowId",
          name: "testApprovalFlowName",
          description: "testApprovalFlowDescription",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
          enableRevoke: false,
        },
      ],
    };

    const getCatalogConfigProvider: CatalogConfigProvider["get"] = () => {
      return okAsync(some(failureCatalogConfig));
    };

    const result = await revokeWorkflow(
      input,
      getCatalogConfigProvider,
      approvalRequestDBProvider,
      approvalFlowDBProvider,
      resourceDBProvider,
      groupMemberShipProvider
    );

    if (result.isOk()) {
      throw new Error("Successful completion is not the expected result");
    }
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.systemMessage).toBe("The requested approvalFlow (testApprovalFlowName) does not have revoke action enabled.");
    expect(result.error.userMessage).toBe("The requested approvalFlow (testApprovalFlowName) does not have revoke action enabled.");
  });

  it("Failure because enableRevoke is undefined", async () => {
    const failureCatalogConfig: CatalogConfig = {
      ...catalogConfig,
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
    };

    const getCatalogConfigProvider: CatalogConfigProvider["get"] = () => {
      return okAsync(some(failureCatalogConfig));
    };

    const result = await revokeWorkflow(
      input,
      getCatalogConfigProvider,
      approvalRequestDBProvider,
      approvalFlowDBProvider,
      resourceDBProvider,
      groupMemberShipProvider
    );

    if (result.isOk()) {
      throw new Error("Successful completion is not the expected result");
    }
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.systemMessage).toBe("The requested approvalFlow (testApprovalFlowName) does not have revoke action enabled.");
    expect(result.error.userMessage).toBe("The requested approvalFlow (testApprovalFlowName) does not have revoke action enabled.");
  });
});
