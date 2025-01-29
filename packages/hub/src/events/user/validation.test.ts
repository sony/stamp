import { expect, it, describe, vi, beforeEach } from "vitest";
import { validateRequestUserIdImpl, validateTargetUserIdImpl, validateUserIdImpl } from "./validation";
import { ephemeralIdentityPlugin } from "@stamp-lib/stamp-ephemeral-identity-plugin";

async function setupUser() {
  const createUserResult = await ephemeralIdentityPlugin.user.create({ userName: "user1", email: "test@example.com" });
  if (createUserResult.isErr()) {
    throw createUserResult.error;
  }
  const userId = createUserResult.value.userId;

  return { userId };
}

describe("ValidateRequestUserIdInput", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return ok if requestUserId is provided", async () => {
    const { userId } = await setupUser();
    const input = { requestUserId: userId };
    const validateResult = await validateRequestUserIdImpl(input, ephemeralIdentityPlugin.user);
    expect(validateResult.isOk()).toBe(true);
  });

  it("should return error if requestUserId is missing", async () => {
    const input = { requestUserId: "2852d13a-4239-4dd1-bba6-fc3c8b30ff61" }; // requestUserId is random uuid
    const validateResult = await validateRequestUserIdImpl(input, ephemeralIdentityPlugin.user);
    expect(validateResult.isOk()).toBe(false);
    if (validateResult.isErr()) {
      expect(validateResult.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should return same input param", async () => {
    const { userId } = await setupUser();
    const input = { requestUserId: userId, testParameter: "this is test", testObject: { test: "this is test", num: 123, bool: true, array: [] } };
    const validateResult = await validateRequestUserIdImpl(input, ephemeralIdentityPlugin.user);

    expect.assertions(2);
    expect(validateResult.isOk()).toBe(true);
    if (validateResult.isOk()) {
      expect(validateResult.value).toStrictEqual(input);
    }
  });
});

describe("ValidateUserIdInput", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return ok if userId is provided", async () => {
    const { userId } = await setupUser();
    const input = { userId };
    const validateResult = await validateUserIdImpl(input, ephemeralIdentityPlugin.user);
    expect(validateResult.isOk()).toBe(true);
  });

  it("should return error if userId is missing", async () => {
    const input = { userId: "2852d13a-4239-4dd1-bba6-fc3c8b30ff61" }; // userId is random uuid
    const validateResult = await validateUserIdImpl(input, ephemeralIdentityPlugin.user);
    expect(validateResult.isOk()).toBe(false);
    if (validateResult.isErr()) {
      expect(validateResult.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should return same input param", async () => {
    const { userId } = await setupUser();
    const input = { userId, testParameter: "this is test", testObject: { test: "this is test", num: 123, bool: true, array: [] } };
    const validateResult = await validateUserIdImpl(input, ephemeralIdentityPlugin.user);

    expect.assertions(2);
    expect(validateResult.isOk()).toBe(true);
    if (validateResult.isOk()) {
      expect(validateResult.value).toStrictEqual(input);
    }
  });
});

describe("ValidateTargetUserIdInput", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return ok if targetUserId is provided", async () => {
    const { userId } = await setupUser();
    const input = { targetUserId: userId };
    const validateResult = await validateTargetUserIdImpl(input, ephemeralIdentityPlugin.user);
    expect(validateResult.isOk()).toBe(true);
  });

  it("should return error if targetUserId is missing", async () => {
    const input = { targetUserId: "2852d13a-4239-4dd1-bba6-fc3c8b30ff61" }; // targetUserId is random uuid
    const validateResult = await validateTargetUserIdImpl(input, ephemeralIdentityPlugin.user);
    expect(validateResult.isOk()).toBe(false);
    if (validateResult.isErr()) {
      expect(validateResult.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should return same input param", async () => {
    const { userId } = await setupUser();
    const input = { targetUserId: userId, testParameter: "this is test", testObject: { test: "this is test", num: 123, bool: true, array: [] } };
    const validateResult = await validateTargetUserIdImpl(input, ephemeralIdentityPlugin.user);

    expect.assertions(2);
    expect(validateResult.isOk()).toBe(true);
    if (validateResult.isOk()) {
      expect(validateResult.value).toStrictEqual(input);
    }
  });
});
