import { expect, it, describe } from "vitest";
import { extendUserIdByUserName } from "./getUserIdByUserName";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("extendUserIdByUserName function", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const config = {
    region: "us-west-2",
    identityStoreId: process.env.IDENTITY_STORE_ID!,
  };
  const existingUserName = process.env.EXISTING_USER_NAME!;
  const existingUserId = process.env.EXISTING_USER_ID!;

  it("Successful case in getUserIdByUserName", async () => {
    const input = {
      userName: existingUserName, // Specify "Name" (not "Display Name")
    };
    const expected = {
      userName: existingUserName,
      userId: existingUserId,
    };
    const resultAsync = extendUserIdByUserName(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const approvalRequest = result.value;
    expect(approvalRequest).toStrictEqual(expected);
  });

  it("Should return an error when the user does not exist", async () => {
    const input = {
      userName: "not-existent@example.com",
    };
    const resultAsync = extendUserIdByUserName(logger, config)(input);
    const result = await resultAsync;

    expect.assertions(3);
    if (result.isErr()) {
      expect(result.error.message).include("not-existent@example.com");
      expect(result.error.userMessage).include("not-existent@example.com");
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });
});
