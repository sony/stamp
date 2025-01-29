import { describe, it, expect, vi } from "vitest";
import { deleteUser } from "./deleteUser";
import { DeleteUserInput } from "./input";
import { CheckCanEditUser } from "../../../events/user/authz";
import { StampHubError } from "../../../error";
import { DeleteUser, ListGroupMemberShipByUser } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { okAsync, errAsync } from "neverthrow";

describe("deleteUser", () => {
  it("should delete user successfully", async () => {
    const mockCheckCanEditUser: CheckCanEditUser = vi.fn().mockImplementation((input) => okAsync(input));
    const mockDeleteUser: DeleteUser = vi.fn().mockReturnValue(okAsync(undefined));
    const mockListGroupMemberShipByUser: ListGroupMemberShipByUser = vi.fn().mockReturnValue(okAsync({ items: [] }));

    const input: DeleteUserInput = { userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab", requestUserId: "d0034c12-db18-4bc2-8dce-3911265e8556" }; // set userId to a random UUID

    const result = await deleteUser(mockCheckCanEditUser, mockDeleteUser, mockListGroupMemberShipByUser)(input);

    expect(result._unsafeUnwrap()).toBeUndefined();
    expect(mockCheckCanEditUser).toHaveBeenCalledWith(input);
    expect(mockDeleteUser).toHaveBeenCalledWith({ userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab" });
  });

  it("should return an error if checkCanEditUser fails", async () => {
    const mockCheckCanEditUser: CheckCanEditUser = vi
      .fn()
      .mockImplementation(() => errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN")));
    const mockDeleteUser: DeleteUser = vi.fn();
    const mockListGroupMemberShipByUser: ListGroupMemberShipByUser = vi.fn().mockReturnValue(okAsync({ items: [] }));

    const input: DeleteUserInput = { userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab", requestUserId: "d0034c12-db18-4bc2-8dce-3911265e8556" }; // set userId to a random UUID
    const result = await deleteUser(mockCheckCanEditUser, mockDeleteUser, mockListGroupMemberShipByUser)(input);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StampHubError);
    expect(result._unsafeUnwrapErr().message).toBe("Permission denied");
    expect(mockCheckCanEditUser).toHaveBeenCalledWith(input);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("should return an error if deleteUser fails", async () => {
    const mockCheckCanEditUser: CheckCanEditUser = vi.fn().mockImplementation((input) => okAsync(input));
    const mockDeleteUser: DeleteUser = vi.fn().mockImplementation(() => errAsync(new StampHubError("Delete failed", "Delete failed", "INTERNAL_SERVER_ERROR")));
    const mockListGroupMemberShipByUser: ListGroupMemberShipByUser = vi.fn().mockReturnValue(okAsync({ items: [] }));

    const input: DeleteUserInput = { userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab", requestUserId: "d0034c12-db18-4bc2-8dce-3911265e8556" }; // set userId to a random UUID
    const result = await deleteUser(mockCheckCanEditUser, mockDeleteUser, mockListGroupMemberShipByUser)(input);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StampHubError);
    expect(result._unsafeUnwrapErr().message).toBe("Delete failed");
    expect(mockCheckCanEditUser).toHaveBeenCalledWith(input);
    expect(mockDeleteUser).toHaveBeenCalledWith({ userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab" });
  });

  it("should not delete user if they belong to any groups", async () => {
    const mockCheckCanEditUser: CheckCanEditUser = vi.fn().mockImplementation((input) => okAsync(input));
    const mockDeleteUser: DeleteUser = vi.fn();
    const mockListGroupMemberShipByUser: ListGroupMemberShipByUser = vi.fn().mockReturnValue(
      okAsync({
        items: [
          {
            groupId: "group1",
            userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab",
            role: "member",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      })
    );

    const input: DeleteUserInput = { userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab", requestUserId: "d0034c12-db18-4bc2-8dce-3911265e8556" };

    const result = await deleteUser(mockCheckCanEditUser, mockDeleteUser, mockListGroupMemberShipByUser)(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("User belongs to groups");
    expect(mockCheckCanEditUser).toHaveBeenCalledWith(input);
    expect(mockListGroupMemberShipByUser).toHaveBeenCalledWith({ userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab" });
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("should return an error if userId and requestUserId are the same", async () => {
    const mockCheckCanEditUser: CheckCanEditUser = vi.fn();
    const mockDeleteUser: DeleteUser = vi.fn();
    const mockListGroupMemberShipByUser: ListGroupMemberShipByUser = vi.fn();

    const input: DeleteUserInput = { userId: "same-id", requestUserId: "same-id" };
    const result = await deleteUser(mockCheckCanEditUser, mockDeleteUser, mockListGroupMemberShipByUser)(input);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StampHubError);
    expect(result._unsafeUnwrapErr().message).toBe("Cannot delete self");
    expect(mockCheckCanEditUser).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockListGroupMemberShipByUser).not.toHaveBeenCalled();
  });
});
