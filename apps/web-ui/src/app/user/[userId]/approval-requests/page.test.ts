import { test, expect } from "@playwright/test";
import { runTestWithMockServers } from "../../../../../tests/mocks/testEnvironmentSetup";
import { createMockStampHubRouter } from "../../../../../tests/mocks/router/stampHubRouter";

import { TRPCError } from "@trpc/server";
import { TRPCClientError } from "@trpc/client";
import { router, publicProcedure } from "@stamp-lib/stamp-hub";
import type { approvalRequestRouter, userRouter, catalogRouter, approvalFlowRouter, groupRouter } from "@stamp-lib/stamp-hub";
import { createMockProcedure } from "../../../../../tests/mocks/router/mockProcedures";

test.describe.configure({ mode: "serial", timeout: 1000000 });

test("Verifies display items in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(3);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request1", "Dummy Catalog", "Dummy Flow", "approved", "2024-01-01T00:00:00.000Z"]);
    await expect(rowsLocator.nth(1).locator("td")).toHaveText(["request2", "Dummy Catalog", "Dummy Flow", "pending", "2024-02-02T00:00:00.000Z"]);
    await expect(rowsLocator.nth(2).locator("td")).toHaveText(["request3", "Dummy Catalog", "Dummy Flow", "rejected", "2024-03-03T00:00:00.000Z"]);
  });
});

test("TRPCClientError occurs during catalog name and ApprovalFlow name retrieval", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(() => {
      throw new TRPCClientError("request failed");
    }),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(() => {
      throw new TRPCClientError("request failed");
    }),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(3);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request1", "catalog1", "flow1", "approved", "2024-01-01T00:00:00.000Z"]);
    await expect(rowsLocator.nth(1).locator("td")).toHaveText(["request2", "catalog2", "flow2", "pending", "2024-02-02T00:00:00.000Z"]);
    await expect(rowsLocator.nth(2).locator("td")).toHaveText(["request3", "catalog3", "flow3", "rejected", "2024-03-03T00:00:00.000Z"]);
  });
});

test("Verifies display many items in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouterWithManyItems = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: Array.from({ length: 200 }, (_, i) => ({
          requestId: `request${i}`,
          status: "approved",
          catalogId: `catalog${i}`,
          approvalFlowId: `flow${i}`,
          inputParams: [],
          inputResources: [],
          requestUserId: "requestUserID",
          approverType: "group",
          approverId: `approver${i}`,
          requestDate: `2024-01-0${i + 1}T00:00:00.000Z`,
          requestComment: `test comment ${i}`,
          validatedDate: `2024-01-0${i + 1}T00:01:00.000Z`,
          validationHandlerResult: {
            isSuccess: true,
            message: `Validation message ${i}`,
          },
          approvedDate: `2024-01-0${i + 1}T00:02:00.000Z`,
          approvedHandlerResult: { isSuccess: true, message: `Approval message ${i}` },
          userIdWhoApproved: `approver${i}`,
          approvedComment: `Approved comment ${i}`,
        })),
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouterWithManyItems,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(200);
  });
});

test("Includes nextToken on first request", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  let isFirstCall = true;
  const mockApprovalRequestRouterWithNextToken = router({
    listByRequestUserId: publicProcedure.query(async () => {
      console.log("call listByRequestUserId isFirstCall", isFirstCall);
      const items = Array.from({ length: 100 }, (_, i) => ({
        requestId: `request${i}`,
        status: "approved",
        catalogId: `catalog${i}`,
        approvalFlowId: `flow${i}`,
        inputParams: [],
        inputResources: [],
        requestUserId: "requestUserID",
        approverType: "group",
        approverId: `approver${i}`,
        requestDate: `2024-01-0${i + 1}T00:00:00.000Z`,
        requestComment: `test comment ${i}`,
        validatedDate: `2024-01-0${i + 1}T00:01:00.000Z`,
        validationHandlerResult: {
          isSuccess: true,
          message: `Validation message ${i}`,
        },
        approvedDate: `2024-01-0${i + 1}T00:02:00.000Z`,
        approvedHandlerResult: { isSuccess: true, message: `Approval message ${i}` },
        userIdWhoApproved: `approver${i}`,
        approvedComment: `Approved comment ${i}`,
      }));
      if (isFirstCall) {
        isFirstCall = false;
        return { items, paginationToken: "nextToken" };
      } else {
        return { items };
      }
    }),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouterWithNextToken,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(200);
  });
});

test("When Stamp Hub throws an error", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const errorThrowingMockApprovalRequest = router({
    listByRequestUserId: publicProcedure.query(() => {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      });
    }),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: errorThrowingMockApprovalRequest,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests");
    await page.waitForLoadState("load");
  });
});

test("Verifies that display items are correctly filtered by approver in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests?approverId=approver1");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(1);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request1", "Dummy Catalog", "Dummy Flow", "approved", "2024-01-01T00:00:00.000Z"]);
  });
});

test("Verifies that display items are correctly filtered by status in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests?status=pending");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(1);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request2", "Dummy Catalog", "Dummy Flow", "pending", "2024-02-02T00:00:00.000Z"]);
  });
});

test("Verifies that display items are correctly filtered by catalog in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests?catalogId=catalog3");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(1);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request3", "Dummy Catalog", "Dummy Flow", "rejected", "2024-03-03T00:00:00.000Z"]);
  });
});

test("Verifies that display items are correctly filtered by approvalFlowId in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests?approvalFlowId=flow1");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(1);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request1", "Dummy Catalog", "Dummy Flow", "approved", "2024-01-01T00:00:00.000Z"]);
  });
});

test("Verifies that display items are correctly filtered by inputParams(string) in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [
              {
                id: "name",
                value: "John",
              },
            ],
            inputResources: [],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [
              {
                id: "name",
                value: "Smith",
              },
            ],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [
              {
                id: "name",
                value: "Alice",
              },
            ],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests?inputParams_name=Smith");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(1);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request2", "Dummy Catalog", "Dummy Flow", "pending", "2024-02-02T00:00:00.000Z"]);
  });
});

test("Verifies that display items are correctly filtered by inputParams(number) in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [
              {
                id: "age",
                value: 20,
              },
            ],
            inputResources: [],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [
              {
                id: "age",
                value: 30,
              },
            ],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [
              {
                id: "age",
                value: 40,
              },
            ],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests?inputParams_age=40");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(1);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request3", "Dummy Catalog", "Dummy Flow", "rejected", "2024-03-03T00:00:00.000Z"]);
  });
});

test("Verifies that display items are correctly filtered by inputParams(boolean) in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [
              {
                id: "isAdmin",
                value: false,
              },
            ],
            inputResources: [],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [
              {
                id: "isAdmin",
                value: true,
              },
            ],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [
              {
                id: "isAdmin",
                value: false,
              },
            ],
            inputResources: [],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests?inputParams_isAdmin=false");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(2);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request1", "Dummy Catalog", "Dummy Flow", "approved", "2024-01-01T00:00:00.000Z"]);
    await expect(rowsLocator.nth(1).locator("td")).toHaveText(["request3", "Dummy Catalog", "Dummy Flow", "rejected", "2024-03-03T00:00:00.000Z"]);
  });
});

test("Verifies that display items are correctly filtered by inputResources in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [],
            inputResources: [
              {
                resourceTypeId: "aws-account",
                resourceId: "123456789012",
              },
            ],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [],
            inputResources: [
              {
                resourceTypeId: "aws-account",
                resourceId: "987654321098",
              },
            ],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [],
            inputResources: [
              {
                resourceTypeId: "aws-account",
                resourceId: "987654321098",
              },
            ],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests?inputResources_aws-account=987654321098");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(2);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request2", "Dummy Catalog", "Dummy Flow", "pending", "2024-02-02T00:00:00.000Z"]);
    await expect(rowsLocator.nth(1).locator("td")).toHaveText(["request3", "Dummy Catalog", "Dummy Flow", "rejected", "2024-03-03T00:00:00.000Z"]);
  });
});

test("Verifies that display items are correctly filtered by inputParams(boolean) inputResources in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof userRouter.get>({
        userId: "dummy-user-id",
        userName: "Dummy User",
        email: "dummy@dummy.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    ),
  });
  const mockCatalogRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.get>({
        id: "dummy-catalog-id",
        ownerGroupId: "dummy-group-id",
        name: "Dummy Catalog",
        description: "This is a dummy catalog for testing",
        approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
        resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
      })
    ),
    list: publicProcedure.query(
      createMockProcedure<typeof catalogRouter.list>([
        {
          id: "dummy-catalog-id",
          ownerGroupId: "dummy-group-id",
          name: "Dummy Catalog",
          description: "This is a dummy catalog for testing",
          approvalFlowIds: ["dummy-approval-flow-1", "dummy-approval-flow-2"],
          resourceTypeIds: ["dummy-resource-type-1", "dummy-resource-type-2", "dummy-resource-type-3", "dummy-resource-type-4"],
        },
      ])
    ),
  });
  const mockApprovalFlowRouter = router({
    get: publicProcedure.query(
      createMockProcedure<typeof approvalFlowRouter.get>({
        id: "dummy-catalog",
        name: "Dummy Flow",
        description: "This is a dummy Catalog",
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
      })
    ),
  });
  const mockApprovalRequestRouter = router({
    listByRequestUserId: publicProcedure.query(
      createMockProcedure<typeof approvalRequestRouter.listByRequestUserId>({
        items: [
          {
            requestId: "request1",
            status: "approved",
            catalogId: "catalog1",
            approvalFlowId: "flow1",
            inputParams: [
              {
                id: "isAdmin",
                value: false,
              },
            ],
            inputResources: [
              {
                resourceTypeId: "aws-account",
                resourceId: "123456789012",
              },
            ],
            requestUserId: "requestUserID",
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
          },
          {
            requestId: "request2",
            status: "pending",
            catalogId: "catalog2",
            approvalFlowId: "flow2",
            inputParams: [
              {
                id: "isAdmin",
                value: true,
              },
            ],
            inputResources: [
              {
                resourceTypeId: "aws-account",
                resourceId: "987654321098",
              },
            ],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver2",
            requestDate: "2024-02-02T00:00:00.000Z",
            requestComment: "test comment 2",
            validatedDate: "2024-02-02T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 2",
            },
          },
          {
            requestId: "request3",
            status: "rejected",
            catalogId: "catalog3",
            approvalFlowId: "flow3",
            inputParams: [
              {
                id: "isAdmin",
                value: false,
              },
            ],
            inputResources: [
              {
                resourceTypeId: "aws-account",
                resourceId: "987654321098",
              },
            ],
            requestUserId: "requestUserID",
            approverType: "group",
            approverId: "approver3",
            requestDate: "2024-03-03T00:00:00.000Z",
            requestComment: "test comment 3",
            validatedDate: "2024-03-03T00:01:00.000Z",
            validationHandlerResult: {
              isSuccess: true,
              message: "Validation message 3",
            },
            rejectedDate: "2024-03-03T00:02:00.000Z",
            userIdWhoRejected: "rejecter3",
            rejectComment: "Rejected comment 3",
          },
        ],
      })
    ),
  });
  const mockGroupRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof groupRouter.list>({
        items: [
          {
            groupId: "00000000-1111-2222-3333-0000000000001",
            groupName: "ResearchTeam",
            description: "Research team's group",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000002",
            groupName: "DevelopmentSquad",
            description: "Development squad's group",
            createdAt: "2024-03-26T03:04:05.006Z",
            updatedAt: "2024-03-26T07:08:09.010Z",
          },
          {
            groupId: "00000000-1111-2222-3333-0000000000003",
            groupName: "MarketingCrew",
            description: "Marketing crew's group",
            createdAt: "2024-03-27T03:04:05.006Z",
            updatedAt: "2024-03-27T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
    userRequest: router({
      approvalRequest: mockApprovalRequestRouter,
      approvalFlow: mockApprovalFlowRouter,
      catalog: mockCatalogRouter,
      group: mockGroupRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto(
      "http://localhost:3000/user/00000000-1111-2222-3333-0000000000001/approval-requests?inputParams_isAdmin=false&inputResources_aws-account=987654321098"
    );
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const userNameLocator = page.locator('span[aria-label="userName"]');
    await expect(userNameLocator).toHaveText("Dummy User");

    const rowsLocator = page.getByRole("row", { name: "userRequest" });
    await expect(rowsLocator).toHaveCount(1);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["request3", "Dummy Catalog", "Dummy Flow", "rejected", "2024-03-03T00:00:00.000Z"]);
  });
});
