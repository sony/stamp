import { expect, it, describe, vi } from "vitest";
import { checkCanEditUser } from "./authz";
import { IsAdmin } from "../admin/isAdmin";
import { EditUserInput } from "../../inputAuthzModel";
import { okAsync, errAsync } from "neverthrow";
import { StampHubError } from "../../error";

describe("checkCanEditUser", () => {
  it("should allow editing if user is admin", async () => {
    const isAdmin: IsAdmin = vi.fn().mockReturnValue(okAsync(true));
    const input: EditUserInput = { userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab", requestUserId: "d0034c12-db18-4bc2-8dce-3911265e8556" }; // set userId to a random UUID

    const result = await checkCanEditUser(isAdmin)(input);

    expect(result._unsafeUnwrap()).toEqual(input);
  });

  it("should deny editing if user is not admin", async () => {
    const isAdmin: IsAdmin = vi.fn().mockReturnValue(okAsync(false));
    const input: EditUserInput = { userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab", requestUserId: "d0034c12-db18-4bc2-8dce-3911265e8556" }; // set userId to a random UUID

    const result = await checkCanEditUser(isAdmin)(input);

    expect(result._unsafeUnwrapErr()).toStrictEqual(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
  });

  it("should return error if isAdmin returns an error", async () => {
    const isAdmin: IsAdmin = vi
      .fn()
      .mockReturnValue(errAsync(new StampHubError("Unexpected error occurred", "Unexpected error occurred", "INTERNAL_SERVER_ERROR")));
    const input: EditUserInput = { userId: "d1dbfdf2-06d7-4ec8-a68f-2cdd1429ebab", requestUserId: "d0034c12-db18-4bc2-8dce-3911265e8556" }; // set userId to a random UUID
    const result = await checkCanEditUser(isAdmin)(input);

    await expect(result._unsafeUnwrapErr()).toStrictEqual(new StampHubError("Unexpected error occurred", "Unexpected error occurred", "INTERNAL_SERVER_ERROR"));
  });

  it("should return error if input is invalid", async () => {
    const isAdmin: IsAdmin = vi.fn().mockReturnValue(okAsync(true));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = { userId: null, requestUserId: "d0034c12-db18-4bc2-8dce-3911265e8556" }; // invalid userId

    await expect(checkCanEditUser(isAdmin)(input)).toStrictEqual(errAsync(new StampHubError("Invalid input", "Invalid input", "BAD_REQUEST")));
  });
});
