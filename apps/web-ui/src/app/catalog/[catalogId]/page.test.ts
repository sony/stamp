import { test, expect } from "@playwright/test";
import { runTestWithMockServers } from "../../../../tests/mocks/testEnvironmentSetup";
import { createMockStampHubRouter } from "../../../../tests/mocks/router/stampHubRouter";

import { router, publicProcedure } from "@stamp-lib/stamp-hub";
import { approvalRequestRouter, userRouter, catalogRouter, approvalFlowRouter, resourceTypeRouter, resourceRouter, groupRouter } from "@stamp-lib/stamp-hub";
import { createMockProcedure } from "../../../../tests/mocks/router/mockProcedures";
import { listApprovalRequestsByCatalog } from "@/server-lib/hub-clients/approvalRequests/catalog";
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
};

const dummyApprovalRequest: ApprovalRequest = {
  requestId: "request1",
  status: "approved",
  catalogId: "dummy-catalog-id",
  approvalFlowId: "dummy-approval-flow+",
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
  get: publicProcedure.query(createMockProcedure<typeof catalogRouter.get>(dummyCatalog)),
  list: publicProcedure.query(createMockProcedure<typeof catalogRouter.list>([dummyCatalog])),
});

const mockApprovalFlowRouter = router({
  get: publicProcedure.query(createMockProcedure<typeof approvalFlowRouter.get>(dummyApprovalFlow)),
  list: publicProcedure.query(createMockProcedure<typeof approvalFlowRouter.list>([dummyApprovalFlow])),
  update: publicProcedure.mutation(createMockProcedure<typeof approvalFlowRouter.update>(dummyApprovalFlow)),
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
  get: publicProcedure.query(
    createMockProcedure<typeof approvalRequestRouter.get>({
      ...dummyApprovalRequest,
    })
  ),
  listByApprovalFlowId: publicProcedure.query(
    createMockProcedure<typeof approvalRequestRouter.listByApprovalFlowId>({
      items: [dummyApprovalRequest],
    })
  ),
  submit: publicProcedure.mutation(
    createMockProcedure<typeof approvalRequestRouter.submit>({
      requestId: "dummy-request-id",
      status: "pending",
      catalogId: "",
      inputParams: [],
      approverType: "group",
      inputResources: [],
      approvalFlowId: "dummy-approval-flow+",
      requestUserId: "test-user-id",
      approverId: "test-approver-id",
      requestDate: "2024-01-01T00:00:00.000Z",
      requestComment: "",
      validatedDate: "2024-01-01T00:00:00.000Z",
      validationHandlerResult: {
        message: "",
        isSuccess: true,
      },
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

const customStampHubRouter = createMockStampHubRouter({
  systemRequest: router({
    user: mockUserRouter,
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

test("Should be able to access page even if approvalFlowTypeId and approvalFlowId contain + character", async ({ page, context }) => {
  // Click the submit button
  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/catalog/dummy-catalog-id");
    await page.waitForLoadState("load");
    await page.getByRole("link", { name: "Submit" }).click();
    await page.waitForLoadState("load");
    // await page.screenshot({ path: `screenshot_Submit.png` });
    const breadcrumbText = await page.getByText("Dummy Flow").first();
    await expect(breadcrumbText).toBeVisible();
  });

  // Click the request button
  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/catalog/dummy-catalog-id");
    await page.waitForLoadState("load");
    await page.getByRole("link", { name: "Request" }).click();
    await page.waitForLoadState("load");
    // await page.screenshot({ path: `screenshot_Request.png` });
    const breadcrumbText = await page.getByText("Dummy Flow").first();
    await expect(breadcrumbText).toBeVisible();
  });

  // Click the resource type link
  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/catalog/dummy-catalog-id");
    await page.waitForLoadState("load");
    await page.getByRole("link", { name: "Dummy Resource Type" }).click();
    await page.waitForLoadState("load");
    // await page.screenshot({ path: `screenshot_Dummy Resource Type.png` });
    const breadcrumbText = await page.getByText("Dummy Resource Type").first();
    await expect(breadcrumbText).toBeVisible();
  });

  // Submit the approvalRequest form
  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/catalog/dummy-catalog-id/approval-flow/dummy-approval-flow%2B/submit");
    await page.waitForLoadState("load");
    await page.getByRole("button", { name: "Request" }).click();

    await page.waitForURL(/\/catalog\/dummy-catalog-id\/approval-flow\/dummy-approval-flow%2B\/request\/.*/);
    const breadcrumbText = await page.getByText("Dummy Flow").first();
    await expect(breadcrumbText).toBeVisible();
  });
});

test("Should open Approver Setting modal and update ApproverGroup successfully", async ({ page, context }) => {
  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/catalog/dummy-catalog-id");
    await page.waitForLoadState("load");

    // Open DotsMenu
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForSelector("text=Approver Setting");

    // Click Approver Setting
    await page.getByRole("menuitem", { name: "Approver setting" }).click();
    await page.waitForLoadState("load");

    // Wait until dialog becomes visible
    const dialog = await page.getByRole("dialog", { name: "Update approver group" });
    dialog.waitFor({ state: "visible" });

    // Fill in Group ID
    await page.getByRole("textbox", { name: "Group ID" }).fill("updated-group-id");

    // Click Update
    await page.getByRole("button", { name: "Update" }).click();

    // Wait until dialog is hidden (success)
    await dialog.waitFor({ state: "hidden" });
    // Check dialog is hidden
    await expect(dialog).toBeHidden();
  });
});

test("Should disable Approver Setting menu item when isApproverSetting is false", async ({ page, context }) => {
  const dummyApprovalFlowWithResourceApprover: ApprovalFlowInfo = {
    id: "dummy-approval-flow+",
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
    approver: { approverType: "resource", resourceTypeId: "test-resource-type" },
  };

  const mockApprovalFlowRouterWithResourceApprover = router({
    get: publicProcedure.query(createMockProcedure<typeof approvalFlowRouter.get>(dummyApprovalFlowWithResourceApprover)),
    list: publicProcedure.query(createMockProcedure<typeof approvalFlowRouter.list>([dummyApprovalFlowWithResourceApprover])),
    update: publicProcedure.mutation(createMockProcedure<typeof approvalFlowRouter.update>(dummyApprovalFlowWithResourceApprover)),
  });

  const customStampHubRouterWithResourceApprover = createMockStampHubRouter({
    systemRequest: router({
      user: mockUserRouter,
    }),
    userRequest: router({
      approvalFlow: mockApprovalFlowRouterWithResourceApprover,
      catalog: mockCatalogRouter,
      resourceType: mockResourceTypeRouter,
    }),
  });

  await runTestWithMockServers(context, customStampHubRouterWithResourceApprover, async () => {
    await page.goto("http://localhost:3000/catalog/dummy-catalog-id");
    await page.waitForLoadState("load");

    // Open DotsMenu
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForSelector("text=Approver Setting");

    // Click Approver Setting
    await expect(page.getByRole("menuitem", { name: "Approver setting" })).toBeDisabled();
  });
});
