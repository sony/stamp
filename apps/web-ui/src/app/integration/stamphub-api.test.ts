import { test, expect } from "@playwright/test";
import { createStampHubHTTPServer, createStampHubHTTPServerBatchClient, isStampHubClientError } from "@stamp-lib/stamp-hub";
import { createConfigProvider } from "@stamp-lib/stamp-config";
import { createEphemeralDBPlugin } from "@stamp-lib/stamp-ephemeral-db-plugin";
import { ephemeralIdentityPluginForAllUserAdmin } from "@stamp-lib/stamp-ephemeral-identity-plugin";
import { unicornRentalCatalog } from "@stamp-lib/stamp-example-catalog";

// Increase timeout for integration tests
test.describe.configure({ mode: "serial", timeout: 120000 });

test.describe("StampHub tRPC API Integration Tests", () => {
  test("Create and retrieve a user via systemRequest", async () => {
    const client = createStampHubHTTPServerBatchClient("http://localhost:4001");

    // Create a user
    const createdUser = await client.systemRequest.user.create.mutate({
      userName: "TestUser",
      email: "testuser@example.com",
    });
    expect(createdUser).toBeDefined();
    expect(createdUser.userId).toBeDefined();
    expect(createdUser.userName).toBe("TestUser");
    expect(createdUser.email).toBe("testuser@example.com");

    // Retrieve the user
    const retrievedUser = await client.systemRequest.user.get.query({
      userId: createdUser.userId,
    });
    expect(retrievedUser.userId).toBe(createdUser.userId);
    expect(retrievedUser.userName).toBe("TestUser");
    expect(retrievedUser.email).toBe("testuser@example.com");
  });

  test("Account link flow (simulates Auth.js JWT callback)", async () => {
    const client = createStampHubHTTPServerBatchClient("http://localhost:4001");

    // Step 1: Create a user (like what happens on first sign-in)
    const user = await client.systemRequest.user.create.mutate({
      userName: "AuthTestUser",
      email: "authtest@example.com",
    });
    expect(user.userId).toBeDefined();

    // Step 2: Set account link (like what Auth.js JWT callback does)
    await client.systemRequest.accountLink.set.mutate({
      accountProviderName: "web-app",
      accountId: "mock-sub-12345",
      userId: user.userId,
    });

    // Step 3: Get account link (like what Auth.js JWT callback does on subsequent logins)
    const accountLink = await client.systemRequest.accountLink.get.query({
      accountProviderName: "web-app",
      accountId: "mock-sub-12345",
    });
    expect(accountLink.userId).toBe(user.userId);

    // Step 4: Get user from account link (completing the JWT callback flow)
    const linkedUser = await client.systemRequest.user.get.query({
      userId: accountLink.userId,
    });
    expect(linkedUser.userName).toBe("AuthTestUser");
    expect(linkedUser.email).toBe("authtest@example.com");
  });

  test("User request operations - catalog list", async () => {
    const client = createStampHubHTTPServerBatchClient("http://localhost:4001");

    // List catalogs (this is what the catalog page does)
    const catalogs = await client.userRequest.catalog.list.query();
    expect(Array.isArray(catalogs)).toBe(true);
    // Should have the unicornRentalCatalog
    expect(catalogs.length).toBeGreaterThan(0);
  });

  test("User request operations - group CRUD", async () => {
    const client = createStampHubHTTPServerBatchClient("http://localhost:4001");

    // Create a user first
    const user = await client.systemRequest.user.create.mutate({
      userName: "GroupTestUser",
      email: "grouptest@example.com",
    });

    // Create a group
    const group = await client.userRequest.group.create.mutate({
      groupName: "TestGroup",
      description: "Test group for integration testing",
      requestUserId: user.userId,
    });
    expect(group.groupId).toBeDefined();
    expect(group.groupName).toBe("TestGroup");

    // Get the group
    const retrievedGroup = await client.userRequest.group.get.query({
      groupId: group.groupId,
      requestUserId: user.userId,
    });
    expect(retrievedGroup.groupName).toBe("TestGroup");

    // Update the group
    const updatedGroup = await client.userRequest.group.update.mutate({
      groupId: group.groupId,
      groupName: "UpdatedGroup",
      description: "Updated description",
      requestUserId: user.userId,
    });
    expect(updatedGroup.groupName).toBe("UpdatedGroup");

    // List groups
    const groups = await client.userRequest.group.list.query({
      requestUserId: user.userId,
    });
    expect(groups.items.length).toBeGreaterThan(0);
    const found = groups.items.find((g: { groupId: string }) => g.groupId === group.groupId);
    expect(found).toBeDefined();
  });

  test("Error handling - NOT_FOUND for non-existent user", async () => {
    const client = createStampHubHTTPServerBatchClient("http://localhost:4001");

    try {
      await client.systemRequest.user.get.query({
        userId: "non-existent-user-id",
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(isStampHubClientError(error)).toBe(true);
      if (isStampHubClientError(error)) {
        expect(error.data?.code).toBe("NOT_FOUND");
      }
    }
  });

  test("Error handling - NOT_FOUND for non-existent account link", async () => {
    const client = createStampHubHTTPServerBatchClient("http://localhost:4001");

    try {
      await client.systemRequest.accountLink.get.query({
        accountProviderName: "web-app",
        accountId: "non-existent-account-id",
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(isStampHubClientError(error)).toBe(true);
      if (isStampHubClientError(error)) {
        expect(error.data?.code).toBe("NOT_FOUND");
      }
    }
  });
});
