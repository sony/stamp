import { test, expect } from "@playwright/test";
import { runTestWithMockServers } from "../../../tests/mocks/testEnvironmentSetup";
import { createMockStampHubRouter } from "../../../tests/mocks/router/stampHubRouter";

import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "@stamp-lib/stamp-hub";
import type { userRouter } from "@stamp-lib/stamp-hub";
import { createMockProcedure } from "../../../tests/mocks/router/mockProcedures";

test.describe.configure({ mode: "serial", timeout: 1000000 });

test("Verifies display items in the normal case", async ({ page, context }) => {
  const mockUserRouter = router({
    list: publicProcedure.query(
      createMockProcedure<typeof userRouter.list>({
        users: [
          {
            userId: "00000000-1111-2222-3333-0000000000001",
            userName: "Alice",
            email: "Alice@dummy.com",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            userId: "00000000-1111-2222-3333-0000000000002",
            userName: "Bob",
            email: "Bob@dummy.com",
            createdAt: "2024-03-24T03:04:05.106Z",
            updatedAt: "2024-03-24T07:08:09.110Z",
          },
          {
            userId: "00000000-1111-2222-3333-0000000000003",
            userName: "Charlie",
            email: "Charlie@dummy.com",
            createdAt: "2024-03-23T03:04:05.106Z",
            updatedAt: "2024-03-23T07:08:09.110Z",
          },
        ],
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouter }),
  });
  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const rowsLocator = page.getByRole("row", { name: "stampUser" });
    await expect(rowsLocator).toHaveCount(3);
    await expect(rowsLocator.nth(0).locator("td")).toHaveText(["Alice", "Alice@dummy.com", "00000000-1111-2222-3333-0000000000001", ""]);
    await expect(rowsLocator.nth(1).locator("td")).toHaveText(["Bob", "Bob@dummy.com", "00000000-1111-2222-3333-0000000000002", ""]);
    await expect(rowsLocator.nth(2).locator("td")).toHaveText(["Charlie", "Charlie@dummy.com", "00000000-1111-2222-3333-0000000000003", ""]);
  });
});

test("Verifies display many items in the normal case", async ({ page, context }) => {
  const mockUserRouterWithManyItems = router({
    list: publicProcedure.query(
      createMockProcedure<typeof userRouter.list>({
        users: Array.from({ length: 200 }, (_, i) => ({
          userId: `00000000-1111-2222-3333-${String(i).padStart(12, "0")}`,
          userName: `User ${i + 1}`,
          email: `user${i + 1}@dummy.com`,
          createdAt: `2024-03-25T03:04:05.${String(i + 1).padStart(3, "0")}Z`,
          updatedAt: `2024-03-25T07:08:09.${String(i + 1).padStart(3, "0")}Z`,
        })),
      })
    ),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouterWithManyItems }),
  });
  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const rowsLocator = page.getByRole("row", { name: "stampUser" });
    await expect(rowsLocator).toHaveCount(200);
  });
});

test("Includes nextToken on first request", async ({ page, context }) => {
  let isFirstCall = true;
  const mockUserRouterWithNextToken = router({
    list: publicProcedure.query(async () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        userId: `00000000-1111-2222-3333-${String(i).padStart(12, "0")}`,
        userName: `User ${i + 1}`,
        email: `user${i + 1}@dummy.com`,
        createdAt: `2024-03-25T03:04:05.${String(i + 1).padStart(3, "0")}Z`,
        updatedAt: `2024-03-25T07:08:09.${String(i + 1).padStart(3, "0")}Z`,
      }));

      if (isFirstCall) {
        isFirstCall = false;
        return { users, nextPaginationToken: "nextToken" };
      } else {
        return { users };
      }
    }),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouterWithNextToken }),
  });
  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user");
    await page.waitForLoadState("load");
    await expect(page).toHaveTitle(/Stamp/);

    const rowsLocator = page.getByRole("row", { name: "stampUser" });
    await expect(rowsLocator).toHaveCount(200);
  });
});

test("When Stamp Hub throws an error", async ({ page, context }) => {
  const errorThrowingMockUserRouter = router({
    list: publicProcedure.query(() => {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      });
    }),
  });
  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: errorThrowingMockUserRouter }),
  });
  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user");
    await page.waitForLoadState("load");
  });
});

test("Deletes a user via the Delete member menu", async ({ page, context }) => {
  const userIdToDelete = "00000000-1111-2222-3333-0000000000001";
  const userNameToDelete = "DeleteTargetUser";

  const mockUserRouterWithDelete = router({
    list: publicProcedure.query(
      createMockProcedure<typeof userRouter.list>({
        users: [
          {
            userId: userIdToDelete,
            userName: userNameToDelete,
            email: "delete-target@dummy.com",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
          {
            userId: "00000000-1111-2222-3333-0000000000002",
            userName: "TestUser",
            email: "testuser@dummy.com",
            createdAt: "2024-03-25T03:04:05.006Z",
            updatedAt: "2024-03-25T07:08:09.010Z",
          },
        ],
      })
    ),
  });
  const mockUserRequest = router({
    delete: publicProcedure.mutation(createMockProcedure<typeof userRouter.delete>(void 0)),
  });

  const customStampHubRouter = createMockStampHubRouter({
    systemRequest: router({ user: mockUserRouterWithDelete }),
    userRequest: router({ user: mockUserRequest }),
  });

  await runTestWithMockServers(context, customStampHubRouter, async () => {
    await page.goto("http://localhost:3000/user");
    await page.waitForLoadState("load");

    // Open the delete menu for the specific user
    const userRow = page.getByRole("row", { name: "stampUser" }).filter({ hasText: userNameToDelete });
    await userRow.getByRole("button", { name: "Open menu" }).click(); // Open DotsMenu

    // Click on the DeleteUser menu item
    await page.getByText("DeleteUser").click();

    // Confirm deletion
    await page.getByRole("button", { name: "Delete" }).click();

    // Verify the user is deleted
    await expect(userRow).toHaveCount(0);
  });
});
