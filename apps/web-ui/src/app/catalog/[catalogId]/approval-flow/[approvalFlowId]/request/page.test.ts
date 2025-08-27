import { test, expect } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import { runTestWithMockServers } from "../../../../../../../tests/mocks/testEnvironmentSetup";
import { createMockStampHubRouter } from "../../../../../../../tests/mocks/router/stampHubRouter";

import { router, publicProcedure } from "@stamp-lib/stamp-hub";
import { approvalRequestRouter, userRouter, catalogRouter, approvalFlowRouter, resourceTypeRouter, resourceRouter, groupRouter } from "@stamp-lib/stamp-hub";
import { createMockProcedure } from "../../../../../../../tests/mocks/router/mockProcedures";
import { ApprovalFlowInfo, ApprovalRequest } from "@stamp-lib/stamp-types/models";

test.describe.configure({ mode: "serial", timeout: 1000000 });

const dummyCatalog = {
  id: "dummy-catalog-id",
  ownerGroupId: "dummy-group-id",
  name: "Dummy Catalog",
  description: "This is a dummy catalog for testing",
  approvalFlowIds: ["dummy-approval-flow+"],
  resourceTypeIds: ["dummy-resource-type+"],
};

const dummyApprovalFlow: ApprovalFlowInfo = {
  id: "dummy-approval-flow+",
  name: "Dummy Flow",
  description: "This is a dummy approval flow",
  catalogId: "dummy-catalog-id",
  inputParams: [
    {
      type: "string",
      id: "dummy-id",
      name: "dummy-name",
      required: true,
      description: "dummy-description",
    },
  ],
  approver: { approverType: "approvalFlow" },
};

const dummyApprovalRequestWithDeletedUser: ApprovalRequest = {
  requestId: "request1",
  status: "approved",
  catalogId: "dummy-catalog-id",
  approvalFlowId: "dummy-approval-flow+",
  inputParams: [],
  inputResources: [],
  requestUserId: "deleted-user-id", // This user will not be found
  approverType: "group",
  approverId: "approver1",
  requestDate: "2024-01-01T00:00:00.000Z",
  requestComment: "test comment 1",
  validatedDate: "2024-01-01T00:01:00.000Z",
  validationHandlerResult: {
    isSuccess: true,
    message: "Validation message 1",
  },
  approvedDate: "2024-01-01T00:02:00.000Z",
  approvedHandlerResult: { isSuccess: true, message: "Approval message 1" },
  userIdWhoApproved: "approver1",
  approvedComment: "Approved comment 1",
};

const dummyResourceType = {
  id: "dummy-resource-type+",
  catalogId: "dummy-catalog-id",
  name: "Dummy Resource Type",
  description: "This is a dummy resource type for testing",
  createParams: [],
  infoParams: [],
  isCreatable: false,
  isUpdatable: false,
  isDeletable: false,
  ownerManagement: false,
  approverManagement: false,
};

// Mock user router that throws NOT_FOUND for all user queries (simulating deleted users)
const mockUserRouterWithDeletedUser = router({
  get: publicProcedure.query(() => {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }),
});

// Mock user router that returns valid user data
const mockUserRouterWithValidUser = router({
  get: publicProcedure.query(
    createMockProcedure<typeof userRouter.get>({
      userId: "valid-user-id",
      userName: "Valid User",
      email: "valid@dummy.com",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    })
  ),
});

const mockCatalogRouter = router({
  get: publicProcedure.query(createMockProcedure<typeof catalogRouter.get>(dummyCatalog)),
  list: publicProcedure.query(createMockProcedure<typeof catalogRouter.list>([dummyCatalog])),
});

const mockApprovalFlowRouter = router({
  get: publicProcedure.query(createMockProcedure<typeof approvalFlowRouter.get>(dummyApprovalFlow)),
  list: publicProcedure.query(createMockProcedure<typeof approvalFlowRouter.list>([dummyApprovalFlow])),
});

const mockResourceTypeRouter = router({
  get: publicProcedure.query(createMockProcedure<typeof resourceTypeRouter.get>(dummyResourceType)),
  list: publicProcedure.query(createMockProcedure<typeof resourceTypeRouter.list>([dummyResourceType])),
});

const mockResourceRouter = router({
  listOutlines: publicProcedure.query(
    createMockProcedure<typeof resourceRouter.listOutlines>({
      items: [],
    })
  ),
});

const mockApprovalRequestRouter = router({
  listByApprovalFlowId: publicProcedure.query(
    createMockProcedure<typeof approvalRequestRouter.listByApprovalFlowId>({
      items: [dummyApprovalRequestWithDeletedUser],
    })
  ),
});

const mockGroupRouter = router({
  get: publicProcedure.query(
    createMockProcedure<typeof groupRouter.get>({
      groupId: "dummy-group-id",
      groupName: "Dummy Group",
      description: "This is a dummy group for testing",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    })
  ),
  list: publicProcedure.query(
    createMockProcedure<typeof groupRouter.list>({
      items: [
        {
          groupId: "dummy-group-id",
          groupName: "Dummy Group",
          description: "This is a dummy group for testing",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    })
  ),
});

test("Should display user ID when user is not found (deleted user)", async ({ page, context }) => {
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({
      user: mockUserRouterWithDeletedUser,
    }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
      resourceType: mockResourceTypeRouter,
      resource: mockResourceRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/catalog/dummy-catalog-id/approval-flow/dummy-approval-flow%2B/request");
    await page.waitForLoadState("load");

    // Check that the approval request table is displayed
    await expect(page.getByRole("table")).toBeVisible();

    // Check that the deleted user ID is displayed as fallback text
    // When user is not found, getUserName should return the userId itself
    await expect(page.getByText("deleted-user-id")).toBeVisible();

    // Verify the request ID link is still functional
    await expect(page.getByRole("link", { name: /request1/ })).toBeVisible();

    // Verify other table content is displayed correctly
    await expect(page.getByText("Dummy Group")).toBeVisible(); // Approver group
    await expect(page.getByText("2024-01-01T00:00:00.000Z")).toBeVisible(); // Request date
  });
});

test("Should display user name when user exists", async ({ page, context }) => {
  // Create approval request with existing user
  const dummyApprovalRequestWithValidUser: ApprovalRequest = {
    ...dummyApprovalRequestWithDeletedUser,
    requestUserId: "valid-user-id",
  };

  const mockApprovalRequestRouterWithValidUser = router({
    listByApprovalFlowId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByApprovalFlowId>({
        items: [dummyApprovalRequestWithValidUser],
      })
    ),
  });

  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({
      user: mockUserRouterWithValidUser,
    }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouterWithValidUser,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
      resourceType: mockResourceTypeRouter,
      resource: mockResourceRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/catalog/dummy-catalog-id/approval-flow/dummy-approval-flow%2B/request");
    await page.waitForLoadState("load");

    // Check that the approval request table is displayed
    await expect(page.getByRole("table")).toBeVisible();

    // Check that the valid user name is displayed instead of user ID
    await expect(page.getByText("Valid User")).toBeVisible();

    // Verify the user ID is not displayed as fallback
    await expect(page.getByText("valid-user-id")).not.toBeVisible();
  });
});
