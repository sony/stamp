import { none, some } from "@stamp-lib/stamp-option";
import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { StampHubError } from "../../../error";
import { IsUserInGroup } from "../../group/membership";
import { createIsRequesterOfResource } from "./isRequesterOfResource";

const userId = "47f29c51-204c-09f6-2069-f3df073568c7";
const groupA = "1f10d463-a2fe-c407-2b95-05b561346c8b";
const groupB = "7c2b9e4d-1a3f-4c5e-9b8a-6d5c4b3a2f1e";

const memberOf =
  (groups: Array<string>): IsUserInGroup =>
  ({ groupId }) =>
    okAsync(groups.includes(groupId));

describe("createIsRequesterOfResource", () => {
  it("returns true when the resource has no DB row", async () => {
    const result = await createIsRequesterOfResource(memberOf([]))({ requestUserId: userId, resourceOnDB: none });
    expect(result._unsafeUnwrap()).toBe(true);
  });

  it("returns true when requesterGroupIds is undefined or empty", async () => {
    const isRequester = createIsRequesterOfResource(memberOf([]));
    expect((await isRequester({ requestUserId: userId, resourceOnDB: some({}) }))._unsafeUnwrap()).toBe(true);
    expect((await isRequester({ requestUserId: userId, resourceOnDB: some({ requesterGroupIds: [] }) }))._unsafeUnwrap()).toBe(true);
  });

  it("returns true when the user is in at least one requester group", async () => {
    const result = await createIsRequesterOfResource(memberOf([groupB]))({ requestUserId: userId, resourceOnDB: some({ requesterGroupIds: [groupA, groupB] }) });
    expect(result._unsafeUnwrap()).toBe(true);
  });

  it("returns false when the user is in none of the requester groups", async () => {
    const result = await createIsRequesterOfResource(memberOf([]))({ requestUserId: userId, resourceOnDB: some({ requesterGroupIds: [groupA, groupB] }) });
    expect(result._unsafeUnwrap()).toBe(false);
  });

  it("propagates membership lookup errors", async () => {
    const failing: IsUserInGroup = vi.fn().mockReturnValue(errAsync(new StampHubError("boom", "boom", "INTERNAL_SERVER_ERROR")));
    const result = await createIsRequesterOfResource(failing)({ requestUserId: userId, resourceOnDB: some({ requesterGroupIds: [groupA] }) });
    expect(result.isErr()).toBe(true);
  });
});
