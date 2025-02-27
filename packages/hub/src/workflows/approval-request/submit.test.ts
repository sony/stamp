import { none, some } from "@stamp-lib/stamp-option";
import { ApprovalFlowHandler } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ok, okAsync } from "neverthrow";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createLogger } from "@stamp-lib/stamp-logger";
import { submitWorkflow, SubmitWorkflowInput } from "./submit";

const logger = createLogger("DEBUG", { moduleName: "unit-test" });

const testApprovalFlowHandler: ApprovalFlowHandler = {
  approvalRequestValidation: vi.fn().mockResolvedValue(ok({ isSuccess: true, message: "approvalRequestValidation Succeeded" })),
  approved: vi.fn(),
  revoked: vi.fn(),
};

describe("submitWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Create mock providers that we'll reuse
  const defaultMockProviders = {
    getCatalogConfigProvider: vi.fn().mockReturnValue(
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
    ),
    setApprovalRequestDBProvider: vi.fn().mockImplementation((input) => okAsync(input)),
    getApprovalFlowById: vi.fn().mockReturnValue(
      okAsync(
        some({
          id: "test-approval-flow-id",
          catalogId: "test-catalog-id",
          approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
        })
      )
    ),
    getResourceById: vi.fn().mockReturnValue(
      okAsync(
        some({
          id: "test-resource-id",
          catalogId: "test-catalog-id",
          resourceTypeId: "test-resource-type-id",
          approverGroupId: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
        })
      )
    ),
    getGroup: vi.fn().mockReturnValue(
      okAsync(
        some({
          id: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
          name: "Test Group",
          description: "Test Group Description",
          approvalRequestNotifications: [],
        })
      )
    ),
    getNotificationPluginConfig: vi.fn().mockReturnValue(okAsync(none)),
    createSchedulerEvent: vi.fn().mockReturnValue(okAsync({ id: "scheduler-event-id" })),
  };

  it("should successfully submit approval request without autoRevokeDuration", async () => {
    const mockProviders = {
      ...defaultMockProviders,
      getCatalogConfigProvider: vi.fn().mockReturnValue(
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
      ),
    };

    const workflow = submitWorkflow(mockProviders, logger);

    const input: SubmitWorkflowInput = {
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
      requestComment: "test request comment",
      inputParams: [],
      inputResources: [],
      catalogId: "test-catalog-id",
    };

    const result = await workflow(input);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().status).toBe("pending");
    expect(mockProviders.setApprovalRequestDBProvider).toHaveBeenCalled();
    expect(testApprovalFlowHandler.approvalRequestValidation).toHaveBeenCalled();
  });

  it("errors when autoRevokeDuration is set but autoRevoke is not enabled", async () => {
    const mockProviders = {
      ...defaultMockProviders,
      getCatalogConfigProvider: vi.fn().mockReturnValue(
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
                // autoRevoke is not enabled
              },
            ],
            resourceTypes: [],
          })
        )
      ),
    };

    const workflow = submitWorkflow(mockProviders, logger);

    const input: SubmitWorkflowInput = {
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
      requestComment: "test request comment",
      inputParams: [],
      inputResources: [],
      catalogId: "test-catalog-id",
      autoRevokeDuration: "PT1H", // Setting autoRevokeDuration when it's not enabled
    };

    const result = await workflow(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("autoRevokeDuration is set but autoRevoke is not enabled");
    expect(mockProviders.setApprovalRequestDBProvider).not.toHaveBeenCalled();
  });

  it("errors when autoRevokeDuration is set but createSchedulerEvent is undefined", async () => {
    const mockProviders = {
      ...defaultMockProviders,
      createSchedulerEvent: undefined, // Remove createSchedulerEvent
      getCatalogConfigProvider: vi.fn().mockReturnValue(
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
                autoRevoke: { enabled: true, defaultSettings: { required: false, maxDuration: "PT48H" } },
              },
            ],
            resourceTypes: [],
          })
        )
      ),
    };

    const workflow = submitWorkflow(mockProviders, logger);

    const input: SubmitWorkflowInput = {
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
      requestComment: "test request comment",
      inputParams: [],
      inputResources: [],
      catalogId: "test-catalog-id",
      autoRevokeDuration: "PT1H",
    };

    const result = await workflow(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("AutoRevokeDuration is set but createSchedulerEvent is not enabled.");
  });

  it("errors when autoRevokeDuration exceeds defaultMaxDuration", async () => {
    const mockProviders = {
      ...defaultMockProviders,
      getCatalogConfigProvider: vi.fn().mockReturnValue(
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
                autoRevoke: { enabled: true, defaultSettings: { required: false, maxDuration: "PT20H" } },
              },
            ],
            resourceTypes: [],
          })
        )
      ),
    };

    const workflow = submitWorkflow(mockProviders, logger);

    const input: SubmitWorkflowInput = {
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
      requestComment: "test request comment",
      inputParams: [],
      inputResources: [],
      catalogId: "test-catalog-id",
      autoRevokeDuration: "PT22H", // Exceeds maxDuration of PT20H
    };

    const result = await workflow(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("autoRevokeDuration exceeds maxDuration limits");
    expect(mockProviders.setApprovalRequestDBProvider).not.toHaveBeenCalled();
  });

  it("passes when autoRevokeDuration is valid", async () => {
    const mockProviders = {
      ...defaultMockProviders,
      getCatalogConfigProvider: vi.fn().mockReturnValue(
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
                autoRevoke: { enabled: true, defaultSettings: { required: false, maxDuration: "PT48H" } },
              },
            ],
            resourceTypes: [],
          })
        )
      ),
    };

    const workflow = submitWorkflow(mockProviders, logger);

    const input: SubmitWorkflowInput = {
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
      requestComment: "test request comment",
      inputParams: [],
      inputResources: [],
      catalogId: "test-catalog-id",
      autoRevokeDuration: "PT24H", // Valid duration
    };

    const result = await workflow(input);
    console.log(result);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().status).toBe("pending");
    expect(mockProviders.setApprovalRequestDBProvider).toHaveBeenCalled();
    // Scheduler event is only created on approve, not on submit
    expect(mockProviders.createSchedulerEvent).not.toHaveBeenCalled();
  });

  it("should handle notification channels when present", async () => {
    const sendNotificationMock = vi.fn().mockReturnValue(okAsync({}));

    const mockProviders = {
      ...defaultMockProviders,
      getGroup: vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "18578bed-c45d-4f67-b9f7-10daf4c85f3f",
            name: "Test Group",
            description: "Test Group Description",
            approvalRequestNotifications: [
              {
                notificationChannel: {
                  id: "notification-channel-id",
                  typeId: "notification-type-id",
                  config: { url: "https://example.com/webhook" },
                },
              },
            ],
          })
        )
      ),
      getNotificationPluginConfig: vi.fn().mockReturnValue(
        okAsync(
          some({
            id: "notification-type-id",
            name: "Test Notification",
            description: "Test Notification Description",
            handlers: {
              sendNotification: sendNotificationMock,
            },
          })
        )
      ),
    };

    const workflow = submitWorkflow(mockProviders, logger);

    const input: SubmitWorkflowInput = {
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
      requestComment: "test request comment",
      inputParams: [],
      inputResources: [],
      catalogId: "test-catalog-id",
    };

    const result = await workflow(input);
    expect(result.isOk()).toBe(true);
    expect(mockProviders.getNotificationPluginConfig).toHaveBeenCalledWith("notification-type-id");
    expect(sendNotificationMock).toHaveBeenCalled();
  });
});
