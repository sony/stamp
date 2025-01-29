import { groupRouter, notificationRouter, publicProcedure, router, userRouter } from "@stamp-lib/stamp-hub";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { expect, test } from "@playwright/test";
import { okAsync } from "neverthrow";
import { StampHubError } from "../../../../../../packages/hub/src/error";
import { createMockProcedure } from "../../../../tests/mocks/router/mockProcedures";
import { createMockStampHubRouter } from "../../../../tests/mocks/router/stampHubRouter";
import { runTestWithMockServers } from "../../../../tests/mocks/testEnvironmentSetup";

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
  list: publicProcedure.query(
    createMockProcedure<typeof userRouter.list>({
      users: [
        {
          userId: "dummy-user-id",
          userName: "Dummy User",
          email: "dummy@dummy.com",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    })
  ),
});

const listNotificationTypesIsEmpty = publicProcedure.query(createMockProcedure<typeof notificationRouter.listNotificationTypes>([]));

const listNotificationTypes = publicProcedure.query(
  createMockProcedure<typeof notificationRouter.listNotificationTypes>([
    {
      id: "slack",
      name: "slack",
      description: "Slack notification plugin",
      channelConfigProperties: [
        { id: "channelId", name: "Required input", description: "Channel ID to send notification", type: "string", required: true },
        { id: "customMessage", name: "Optional input", description: "Message to send with notification", type: "string", required: false },
      ],
    },
  ])
);

const getNotificationType = publicProcedure.query(
  createMockProcedure<typeof notificationRouter.getNotificationType>({
    id: "slack",
    name: "slack",
    description: "Slack notification plugin",
    handlers: {
      setChannel: (notification: { message: string; properties: Record<string, string | number | boolean> }) => {
        return okAsync({
          id: "dummy-notification-id",
          typeId: "slack",
          properties: notification.properties,
        });
      },
      unsetChannel: (notification: { message: string; id: string }) => {
        return okAsync<void, NotificationError>(undefined);
      },
      sendNotification: (notification: {
        message:
          | {
              type: "ResourceAudit";
              property: {
                catalogId: string;
                resourceTypeId: string;
                resourceId: string;
                catalogName: string;
                resourceTypeName: string;
                resourceName: string;
                ResourceAuditItem: { id: string; name: string; description: string }[];
              };
            }
          | { type: string; property: Record<string, unknown> };
        channel: { id: string; typeId: string; properties: Record<string, string | number | boolean> };
      }) => {
        return okAsync<void, NotificationError>(undefined);
      },
    },
    channelConfigProperties: [
      { id: "channelId", name: "Required input", description: "Channel ID to send notification", type: "string", required: true },
      { id: "customMessage", name: "Optional input", description: "Message to send with notification", type: "string", required: false },
    ],
  })
);

// get group
const getGroup = publicProcedure.query(
  createMockProcedure<typeof groupRouter.get>({
    groupId: "dummy-group-id",
    groupName: "Dummy Group",
    description: "This is a dummy group for testing",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  })
);

// get group (exist groupMemberNotifications)
const getGroupWithMemberNotifications = publicProcedure.query(
  createMockProcedure<typeof groupRouter.get>({
    groupId: "dummy-group-id",
    groupName: "Dummy Group",
    description: "This is a dummy group for testing",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    groupMemberNotifications: [
      {
        id: "dummy-notification-id",
        notificationChannel: {
          id: "slack",
          typeId: "slack",
          properties: { channelId: "test-channel-id", customMessage: "test-message" },
        },
      },
    ],
  })
);

// list group membership
const listGroupMemberShipGroup = publicProcedure.query(
  createMockProcedure<typeof groupRouter.listGroupMemberShipByGroup>({
    items: [
      {
        userId: "dummy-user-id",
        createdAt: "2024-01-01T00:00:00.000Z",
        groupId: "dummy-group-id",
        updatedAt: "2024-01-01T00:00:00.000Z",
        role: "owner",
      },
    ],
  })
);

// add user to group
const addUserGroup = publicProcedure.mutation(
  createMockProcedure<typeof groupRouter.addUserToGroup>({
    userId: "dummy-user-id",
    createdAt: "2024-01-01T00:00:00.000Z",
    groupId: "dummy-group-id",
    updatedAt: "2024-01-01T00:00:00.000Z",
    role: "member",
  })
);

// update group
const updateGroup = publicProcedure.mutation(
  createMockProcedure<typeof groupRouter.update>({
    groupId: "dummy-group-id",
    groupName: "Dummy Group",
    description: "This is a dummy group for testing",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  })
);

test.describe.configure({ mode: "serial", timeout: 1000000 });

// Edit Group Dialog
test("Verify that group information can be updated", async ({ page, context }) => {
  const customRouter = createMockStampHubRouter({
    systemRequest: router({
      user: mockUserRouter,
    }),
    userRequest: router({
      group: router({
        get: getGroup,
        listGroupMemberShipByGroup: listGroupMemberShipGroup,
        update: updateGroup,
      }),
    }),
  });

  await runTestWithMockServers(context, customRouter, async () => {
    await page.goto("http://localhost:3000/group/dummy-group-id");
    await page.waitForLoadState("load");

    await page.getByRole("button", { name: "Edit Group" }).click();
    await page.waitForLoadState("load");
    // Wait until dialog becomes visible
    const dialog = await page.getByRole("heading", { name: "Edit group" });
    await expect(dialog).toBeVisible();

    // Check value of text box
    const textBoxGroupName = await page.getByRole("textbox", { name: "Group name" });
    await expect(textBoxGroupName).toHaveValue("Dummy Group");
    const textBoxCustomMessage = await page.getByRole("textbox", { name: "Description" });
    await expect(textBoxCustomMessage).toHaveValue("This is a dummy group for testing");

    // Set values in each text box, click Submit button
    await page.getByRole("textbox", { name: "Group name" }).fill("Update Dummy Group");
    await page.getByRole("textbox", { name: "Description" }).fill("This is a update dummy group for testing");
    await page.getByRole("button", { name: "Submit" }).click();

    // Wait until dialog is hidden (success)
    await dialog.waitFor({ state: "hidden" });
    // Check dialog is hidden
    await expect(dialog).toBeHidden();
  });
});

// Add Member Dialog
test("Verify adding members to the group", async ({ page, context }) => {
  const customRouter = createMockStampHubRouter({
    systemRequest: router({
      user: mockUserRouter,
      notification: router({
        listNotificationTypes: listNotificationTypes,
      }),
    }),
    userRequest: router({
      group: router({
        get: getGroup,
        listGroupMemberShipByGroup: listGroupMemberShipGroup,
        addUserToGroup: addUserGroup,
      }),
    }),
  });

  await runTestWithMockServers(context, customRouter, async () => {
    await page.goto("http://localhost:3000/group/dummy-group-id");
    await page.waitForLoadState("load");

    await page.getByRole("button", { name: "Add Member" }).click();
    await page.waitForLoadState("load");
    // Wait until dialog becomes visible
    const dialog = await page.getByRole("heading", { name: "Add member" });
    await expect(dialog).toBeVisible();

    // Set member(Click, select member from displayed search box), click Update button
    await page.getByRole("button", { name: "Member" }).click();
    await page.getByRole("option", { name: "Dummy User (dummy@dummy.com)" }).click();
    await page.getByRole("button", { name: "Submit" }).click();

    // Wait until dialog is hidden (success)
    await dialog.waitFor({ state: "hidden" });
    // Check dialog is hidden
    await expect(dialog).toBeHidden();
  });
});

test.describe("Group Member Notification", () => {
  // create group member notification
  const createGroupMemberNotification = publicProcedure.mutation(
    createMockProcedure<typeof groupRouter.createGroupMemberNotification>({
      groupId: "dummy-group-id",
      groupName: "Dummy Group",
      description: "This is a dummy group for testing",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      groupMemberNotifications: [
        {
          id: "dummy-notification-id",
          notificationChannel: {
            id: "slack",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
    })
  );

  // create group member notification (failure)
  const createGroupMemberNotificationIsFailure = publicProcedure.mutation(() => {
    throw new StampHubError(
      "An error occurred in createGroupMemberNotification.",
      "An error occurred in createGroupMemberNotification.",
      "INTERNAL_SERVER_ERROR"
    );
  });

  // update group member notification
  const updateGroupMemberNotification = publicProcedure.mutation(
    createMockProcedure<typeof groupRouter.updateGroupMemberNotification>({
      groupId: "dummy-group-id",
      groupName: "Dummy Group",
      description: "This is a dummy group for testing",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      groupMemberNotifications: [
        {
          id: "dummy-notification-id",
          notificationChannel: {
            id: "slack",
            typeId: "slack",
            properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
          },
        },
      ],
    })
  );

  // update group member notification (failure)
  const updateGroupMemberNotificationIsFailure = publicProcedure.mutation(() => {
    throw new StampHubError(
      "An error occurred in updateGroupMemberNotification.",
      "An error occurred in updateGroupMemberNotification.",
      "INTERNAL_SERVER_ERROR"
    );
  });

  // delete group member notification
  const deleteGroupMemberNotificationSuccess = publicProcedure.mutation(
    createMockProcedure<typeof groupRouter.deleteGroupMemberNotification>({
      groupId: "dummy-group-id",
      groupName: "Dummy Group",
      description: "This is a dummy group for testing",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      groupMemberNotifications: [],
    })
  );

  // delete group member notification (failure)
  const deleteGroupMemberNotificationIsFailure = publicProcedure.mutation(() => {
    throw new StampHubError(
      "An error occurred in deleteGroupMemberNotification.",
      "An error occurred in deleteGroupMemberNotification.",
      "INTERNAL_SERVER_ERROR"
    );
  });

  test("Verify that the Group Member Notification dialog is displayed even when no notification types are available", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypesIsEmpty, // empty
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup, // not exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Check notificationTypes do not exist error message display
      const errorText = await page.getByText("No notification types available");
      await expect(errorText).toBeVisible();
    });
  });

  test("Verify that Group Member Notification can be created", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup, // not exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          createGroupMemberNotification: createGroupMemberNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Check text box is empty
      const textBoxChannelId = await page.getByRole("textbox", { name: "Required input" });
      await expect(textBoxChannelId).toHaveValue("");
      const textBoxCustomMessage = await page.getByRole("textbox", { name: "Optional input" });
      await expect(textBoxCustomMessage).toHaveValue("");

      // Set values in each text box, click Update button
      await page.getByRole("textbox", { name: "Required input" }).fill("test-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Verify that Group Member Notification is creatable without providing optional inputs", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup, // not exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          createGroupMemberNotification: createGroupMemberNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Set value in only required text box, click Update button (optional text box is empty)
      await page.getByRole("textbox", { name: "Required input" }).fill("test-channel-id");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Verify that creating a Group Member Notification fails when required fields are not provided", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup, // not exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          createGroupMemberNotification: createGroupMemberNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Without set values in each text box, click Update button.
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("Notification property validation error: Required input: channelConfigProperty.channelId").first();
      await expect(errorText).toBeVisible();
    });
  });

  test("Error message is shown in dialog when creating Group Member Notification fails", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup, // not exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          createGroupMemberNotification: createGroupMemberNotificationIsFailure, // failure
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Set values in each text box, click Update button (return error in createGroupMemberNotification)
      await page.getByRole("textbox", { name: "Required input" }).fill("test-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("An error occurred in createGroupMemberNotification.").first();
      await expect(errorText).toBeVisible();
    });
  });

  test("Verify that Group Member Notification is updetable without providing optional inputs", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithMemberNotifications, // exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          updateGroupMemberNotification: updateGroupMemberNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Check value of text box
      const textBoxChannelId = await page.getByRole("textbox", { name: "Required input" });
      await expect(textBoxChannelId).toHaveValue("test-channel-id");
      const textBoxCustomMessage = await page.getByRole("textbox", { name: "Optional input" });
      await expect(textBoxCustomMessage).toHaveValue("test-message");

      // Set values in each text box, click Update button
      await page.getByRole("textbox", { name: "Required input" }).fill("test-update-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-update-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Update is successful, when only required input value in Group Member Notification dialog", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithMemberNotifications, // exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          updateGroupMemberNotification: updateGroupMemberNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Empty in optional text box, click Update button
      await page.getByRole("textbox", { name: "Required input" }).fill("test-update-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Verify that updating a Group Member Notification fails when required fields are not provided", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithMemberNotifications, // exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          updateGroupMemberNotification: updateGroupMemberNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Empty required text box, click Update button
      await page.getByRole("textbox", { name: "Required input" }).fill("");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-update-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("Notification property validation error: Required input: channelConfigProperty.channelId").first();
      await expect(errorText).toBeVisible();
    });
  });

  test("Error message is shown in dialog when updating Group Member Notification fails", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithMemberNotifications, // exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          updateGroupMemberNotification: updateGroupMemberNotificationIsFailure, // failure
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Set values in each text box, click Update button (return error in updateGroupMemberNotification)
      await page.getByRole("textbox", { name: "Required input" }).fill("test-update-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-update-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("An error occurred in updateGroupMemberNotification.").first();
      await expect(errorText).toBeVisible();
    });
  });

  test("Verify that Group Member Notification is deletable", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithMemberNotifications, // exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          deleteGroupMemberNotification: deleteGroupMemberNotificationSuccess, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Click Delete button
      await page.getByRole("button", { name: "Delete" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Error message is shown in dialog when deleting Group Member Notification fails", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithMemberNotifications, // exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          deleteGroupMemberNotification: deleteGroupMemberNotificationIsFailure, // failure
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Group Member Notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update Group Member Notification" });
      await expect(dialog).toBeVisible();

      // Click Delete button (return error in deleteGroupMemberNotification)
      await page.getByRole("button", { name: "Delete" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("An error occurred in deleteGroupMemberNotification.").first();
      await expect(errorText).toBeVisible();
    });
  });
});

test.describe("Approval request notification", () => {
  // get group (exist approval request notifications)
  const getGroupWithApprovalRequestNotifications = publicProcedure.query(
    createMockProcedure<typeof groupRouter.get>({
      groupId: "dummy-group-id",
      groupName: "Dummy Group",
      description: "This is a dummy group for testing",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      approvalRequestNotifications: [
        {
          id: "dummy-notification-id",
          notificationChannel: {
            id: "slack",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
    })
  );

  // create approval request notification
  const createApprovalRequestNotification = publicProcedure.mutation(
    createMockProcedure<typeof groupRouter.createApprovalRequestNotification>({
      groupId: "dummy-group-id",
      groupName: "Dummy Group",
      description: "This is a dummy group for testing",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      groupMemberNotifications: [
        {
          id: "dummy-notification-id",
          notificationChannel: {
            id: "slack",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
    })
  );

  // create approval request notification (failure)
  const createApprovalRequestNotificationIsFailure = publicProcedure.mutation(() => {
    throw new StampHubError(
      "An error occurred in createApprovalRequestNotification.",
      "An error occurred in createApprovalRequestNotification.",
      "INTERNAL_SERVER_ERROR"
    );
  });

  // update approval request notification
  const updateApprovalRequestNotification = publicProcedure.mutation(
    createMockProcedure<typeof groupRouter.updateApprovalRequestNotification>({
      groupId: "dummy-group-id",
      groupName: "Dummy Group",
      description: "This is a dummy group for testing",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      groupMemberNotifications: [
        {
          id: "dummy-notification-id",
          notificationChannel: {
            id: "slack",
            typeId: "slack",
            properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
          },
        },
      ],
    })
  );

  // update approval request notification (failure)
  const updateApprovalRequestNotificationIsFailure = publicProcedure.mutation(() => {
    throw new StampHubError(
      "An error occurred in updateApprovalRequestNotification.",
      "An error occurred in updateApprovalRequestNotification.",
      "INTERNAL_SERVER_ERROR"
    );
  });

  // delete approval request notification
  const deleteApprovalRequestNotificationSuccess = publicProcedure.mutation(
    createMockProcedure<typeof groupRouter.deleteApprovalRequestNotification>({
      groupId: "dummy-group-id",
      groupName: "Dummy Group",
      description: "This is a dummy group for testing",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      groupMemberNotifications: [],
      approvalRequestNotifications: [],
    })
  );

  // delete approval request notification (failure)
  const deleteApprovalRequestNotificationIsFailure = publicProcedure.mutation(() => {
    throw new StampHubError(
      "An error occurred in deleteApprovalRequestNotification.",
      "An error occurred in deleteApprovalRequestNotification.",
      "INTERNAL_SERVER_ERROR"
    );
  });

  // Approval Request Notification Dialog
  test("Verify that the Approval Request Notification dialog is displayed even when no notification types are available", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypesIsEmpty, // empty
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup,
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Check notificationTypes do not exist error message display
      const errorText = await page.getByText("No notification types available");
      await expect(errorText).toBeVisible();
    });
  });

  test("Verify that Approval request notification can be created", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup, // not exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          createApprovalRequestNotification: createApprovalRequestNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Check text box is empty
      const textBoxChannelId = await page.getByRole("textbox", { name: "Required input" });
      await expect(textBoxChannelId).toHaveValue("");
      const textBoxCustomMessage = await page.getByRole("textbox", { name: "Optional input" });
      await expect(textBoxCustomMessage).toHaveValue("");

      // Set values in each text box, click Update button
      await page.getByRole("textbox", { name: "Required input" }).fill("test-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Verify that approval request notification is creatable without providing optional inputs", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup, // not exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          createApprovalRequestNotification: createApprovalRequestNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Set value in only required text box, click Update button (optional text box is empty)
      await page.getByRole("textbox", { name: "Required input" }).fill("test-channel-id");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Verify that creating a approval request notification fails when required fields are not provided", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup, // not exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          createApprovalRequestNotification: createApprovalRequestNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Without set values in each text box, click Update button.
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("Notification property validation error: Required input: channelConfigProperty.channelId").first();
      await expect(errorText).toBeVisible();
    });
  });

  test("Error message is shown in dialog when creating approval request notification fails", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroup, // not exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          createApprovalRequestNotification: createApprovalRequestNotificationIsFailure, // failure
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Set values in each text box, click Update button (return error in createApprovalRequestNotification)
      await page.getByRole("textbox", { name: "Required input" }).fill("test-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("An error occurred in createApprovalRequestNotification.").first();
      await expect(errorText).toBeVisible();
    });
  });

  test("Verify that approval request notification is updatable without providing optional inputs", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithApprovalRequestNotifications, // exist approvalRequestNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          updateApprovalRequestNotification: updateApprovalRequestNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Check value of text box
      const textBoxChannelId = await page.getByRole("textbox", { name: "Required input" });
      await expect(textBoxChannelId).toHaveValue("test-channel-id");
      const textBoxCustomMessage = await page.getByRole("textbox", { name: "Optional input" });
      await expect(textBoxCustomMessage).toHaveValue("test-message");

      // Set values in each text box, click Update button
      await page.getByRole("textbox", { name: "Required input" }).fill("test-update-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-update-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Update is successful, when only required input value in Group Member Notification dialog", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithApprovalRequestNotifications, // exist approvalRequestNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          updateApprovalRequestNotification: updateApprovalRequestNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Empty in optional text box, click Update button
      await page.getByRole("textbox", { name: "Required input" }).fill("test-update-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Verify that updating a approval request notification fails when required fields are not provided", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithApprovalRequestNotifications, // exist getGroupWithApprovalRequestNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          updateGroupMemberNotification: updateApprovalRequestNotification, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Empty required text box, click Update button
      await page.getByRole("textbox", { name: "Required input" }).fill("");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-update-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("Notification property validation error: Required input: channelConfigProperty.channelId").first();
      await expect(errorText).toBeVisible();
    });
  });

  test("Error message is shown in dialog when updating approval request notification fails", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithApprovalRequestNotifications, // exist groupMemberNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          updateApprovalRequestNotification: updateApprovalRequestNotificationIsFailure, // failure
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Set values in each text box, click Update button (return error in updateApprovalRequestNotification)
      await page.getByRole("textbox", { name: "Required input" }).fill("test-update-channel-id");
      await page.getByRole("textbox", { name: "Optional input" }).fill("test-update-message");
      await page.getByRole("button", { name: "Update" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("An error occurred in updateApprovalRequestNotification.").first();
      await expect(errorText).toBeVisible();
    });
  });

  test("Verify that approval request notification is deletable", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithApprovalRequestNotifications, // exist getGroupWithApprovalRequestNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          deleteApprovalRequestNotification: deleteApprovalRequestNotificationSuccess, // success
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Click Delete button
      await page.getByRole("button", { name: "Delete" }).click();

      // Wait until dialog is hidden (success)
      await dialog.waitFor({ state: "hidden" });
      // Check dialog is hidden
      await expect(dialog).toBeHidden();
    });
  });

  test("Error message is shown in dialog when deleting approval request notification fails", async ({ page, context }) => {
    const customRouter = createMockStampHubRouter({
      systemRequest: router({
        user: mockUserRouter,
        notification: router({
          listNotificationTypes: listNotificationTypes,
          getNotificationType: getNotificationType,
        }),
      }),
      userRequest: router({
        group: router({
          get: getGroupWithApprovalRequestNotifications, // exist getGroupWithApprovalRequestNotifications
          listGroupMemberShipByGroup: listGroupMemberShipGroup,
          deleteApprovalRequestNotification: deleteApprovalRequestNotificationIsFailure, // failure
        }),
      }),
    });

    await runTestWithMockServers(context, customRouter, async () => {
      await page.goto("http://localhost:3000/group/dummy-group-id");
      await page.waitForLoadState("load");

      await page.getByRole("button", { name: "Approval request notification" }).click();
      await page.waitForLoadState("load");
      // Wait until dialog becomes visible
      const dialog = await page.getByRole("heading", { name: "Update approval request notification" });
      await expect(dialog).toBeVisible();

      // Click Delete button (return error in deleteGroupMemberNotification)
      await page.getByRole("button", { name: "Delete" }).click();

      // Wait until error message visible (failed), get first element
      const errorText = await page.getByText("An error occurred in deleteApprovalRequestNotification.").first();
      await expect(errorText).toBeVisible();
    });
  });
});
