import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { ValidateAwsAccountInputWithName, AwsAccount } from "../../types/awsAccount";
import { updateAwsAccountInfo as update } from "../../events/awsAccount/updateAwsAccountInfo";
import z from "zod";

type Config = { region: string; accountManagementTableName: string };
export const UpdateAwsAccountInput = ValidateAwsAccountInputWithName;
export type UpdateAwsAccountInput = z.infer<typeof UpdateAwsAccountInput>;
type UpdateAwsAccountInfo = (input: UpdateAwsAccountInput) => ResultAsync<AwsAccount, HandlerError>;

export const updateAwsAccountInfo =
  (logger: Logger, config: Config): UpdateAwsAccountInfo =>
  (input) => {
    return update(logger, config)(input);
  };
