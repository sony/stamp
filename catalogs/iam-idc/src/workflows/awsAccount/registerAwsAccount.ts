import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { ValidateAwsAccountInputWithName, AwsAccount } from "../../types/awsAccount";
import { registerAwsAccount as register } from "../../events/awsAccount/registerAwsAccount";
import z from "zod";

type Config = { region: string; accountManagementTableName: string };
export const RegisterAwsAccountInput = ValidateAwsAccountInputWithName;
export type RegisterAwsAccountInput = z.infer<typeof RegisterAwsAccountInput>;
type RegisterAwsAccount = (input: RegisterAwsAccountInput) => ResultAsync<AwsAccount, HandlerError>;

export const registerAwsAccount =
  (logger: Logger, config: Config): RegisterAwsAccount =>
  (input) => {
    return register(logger, config)(input);
  };
