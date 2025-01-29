import { expect, it, describe, vi } from "vitest";
import { PrepareRegisterPermissionInput } from "../../types/permission";
import { prepareRegisterPermission } from "./prepareRegisterPermission";
import { GetPermissionInfo } from "./getPermissionInfo";
import { some, none } from "@stamp-lib/stamp-option";
import { okAsync } from "neverthrow";
describe("prepareRegisterPermission", () => {
  it("should success validation", async () => {
    const getPermissionInfo = vi.fn().mockReturnValue(okAsync(none)) as GetPermissionInfo;
    const input: PrepareRegisterPermissionInput = {
      name: "stamp-unit-test",
      description: "unit test",
      awsAccountId: "123456789012",
      permissionSetNameId: "test",
      customIamPolicyNames: ["test"],
      managedIamPolicyNames: ["ReadOnlyAccess"],
      sessionDuration: "PT12H",
    };

    const result = await prepareRegisterPermission("SP", getPermissionInfo)(input);
    expect(result.isOk()).toBe(true);
  });

  it("should return appropriate permissionId", async () => {
    const getPermissionInfo = vi.fn().mockReturnValue(okAsync(none)) as GetPermissionInfo;
    const input: PrepareRegisterPermissionInput = {
      name: "stamp-unit-test",
      description: "unit test",
      awsAccountId: "123456789012",
      permissionSetNameId: "test",
      customIamPolicyNames: ["test"],
      managedIamPolicyNames: ["ReadOnlyAccess"],
      sessionDuration: "PT12H",
    };

    const result = await prepareRegisterPermission("AA", getPermissionInfo)(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.permissionId).toEqual("AA-test-123456789012");
  });

  it("should validation error if permissionSetNameId is over 16 char", async () => {
    const getPermissionInfo = vi.fn().mockReturnValue(okAsync(none)) as GetPermissionInfo;
    const input: PrepareRegisterPermissionInput = {
      name: "stamp-unit-test",
      description: "unit test",
      awsAccountId: "123456789012",
      permissionSetNameId: "long-permission-set-name-id",
      customIamPolicyNames: ["test"],
      managedIamPolicyNames: ["ReadOnlyAccess"],
      sessionDuration: "PT12H",
    };

    const result = await prepareRegisterPermission("SP", getPermissionInfo)(input);
    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.userMessage).include("cannot be longer than 16 characters");
    }
  });

  it("should validation error if permissionIdPrefix is over 2 char", async () => {
    const getPermissionInfo = vi.fn().mockReturnValue(okAsync(none)) as GetPermissionInfo;
    const input: PrepareRegisterPermissionInput = {
      name: "stamp-unit-test",
      description: "unit test",
      awsAccountId: "123456789012",
      permissionSetNameId: "test",
      customIamPolicyNames: ["test"],
      managedIamPolicyNames: ["ReadOnlyAccess"],
      sessionDuration: "PT12H",
    };

    const result = await prepareRegisterPermission("SP1", getPermissionInfo)(input);
    expect(result.isOk()).toBe(false);
  });

  it("should return error if permissionSetNameId already exists", async () => {
    const getPermissionInfo = vi.fn().mockReturnValue(okAsync(some({}))) as GetPermissionInfo;
    const input: PrepareRegisterPermissionInput = {
      name: "stamp-unit-test",
      description: "unit test",
      awsAccountId: "123456789012",
      permissionSetNameId: "test",
      customIamPolicyNames: ["test"],
      managedIamPolicyNames: ["ReadOnlyAccess"],
      sessionDuration: "PT12H",
    };

    const result = await prepareRegisterPermission("SP", getPermissionInfo)(input);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.userMessage).include("already exists in AWS Account");
    }
  });
});
