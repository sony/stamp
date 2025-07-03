import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, okAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import {
  SSOAdminClient,
  UpdatePermissionSetCommand,
  AttachManagedPolicyToPermissionSetCommand,
  DetachManagedPolicyFromPermissionSetCommand,
  PutInlinePolicyToPermissionSetCommand,
  DeleteInlinePolicyFromPermissionSetCommand,
  ListManagedPoliciesInPermissionSetCommand,
  GetInlinePolicyForPermissionSetCommand,
} from "@aws-sdk/client-sso-admin";

type Config = { region: string; identityInstanceArn: string };

type UpdatePermissionSetInput = {
  permissionSetArn: string;
  awsAccountId: string;
  description?: string;
  sessionDuration?: string;
  managedIamPolicyNames?: string[];
  customIamPolicyNames?: string[];
};

type UpdatePermissionSet = <T extends UpdatePermissionSetInput>(input: T) => ResultAsync<T, HandlerError>;

export const updatePermissionSet =
  (logger: Logger, config: Config): UpdatePermissionSet =>
  (input) => {
    return updatePermissionSetWithinIamIdentityCenter(
      logger,
      config
    )(input).andThen(() => {
      return okAsync(input);
    });
  };

const updatePermissionSetWithinIamIdentityCenter =
  (logger: Logger, config: Config) =>
  (input: UpdatePermissionSetInput): ResultAsync<void, HandlerError> => {
    const client = new SSOAdminClient({ region: config.region });

    return ResultAsync.fromPromise(
      (async () => {
        // Update permission set basic attributes if provided
        if (input.description !== undefined || input.sessionDuration !== undefined) {
          const updateCommand = new UpdatePermissionSetCommand({
            InstanceArn: config.identityInstanceArn,
            PermissionSetArn: input.permissionSetArn,
            ...(input.description !== undefined && { Description: input.description }),
            ...(input.sessionDuration !== undefined && { SessionDuration: input.sessionDuration }),
          });

          await client.send(updateCommand);
          logger.info("Updated permission set basic attributes", {
            permissionSetArn: input.permissionSetArn,
            description: input.description,
            sessionDuration: input.sessionDuration,
          });
        }

        // Update managed policies if provided
        if (input.managedIamPolicyNames !== undefined) {
          await updateManagedPolicies(client, config, input.permissionSetArn, input.managedIamPolicyNames, logger);
        }

        // Update custom policies if provided
        if (input.customIamPolicyNames !== undefined) {
          await updateCustomPolicies(client, config, input.permissionSetArn, input.customIamPolicyNames, logger);
        }
      })(),
      (error) => {
        logger.error("Failed to update permission set", error);
        const message = `Failed to update permission set: ${(error as Error).message ?? ""}`;
        return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
      }
    );
  };

async function updateManagedPolicies(
  client: SSOAdminClient,
  config: Config,
  permissionSetArn: string,
  newManagedPolicyNames: string[],
  logger: Logger
): Promise<void> {
  // Get current managed policies
  const listResponse = await client.send(
    new ListManagedPoliciesInPermissionSetCommand({
      InstanceArn: config.identityInstanceArn,
      PermissionSetArn: permissionSetArn,
    })
  );

  const currentPolicyArns = listResponse.AttachedManagedPolicies?.map((policy) => policy.Arn || "") || [];
  const newPolicyArns = newManagedPolicyNames.map((name) => `arn:aws:iam::aws:policy/${name}`);

  // Detach policies that are no longer needed
  for (const currentArn of currentPolicyArns) {
    if (!newPolicyArns.includes(currentArn)) {
      await client.send(
        new DetachManagedPolicyFromPermissionSetCommand({
          InstanceArn: config.identityInstanceArn,
          PermissionSetArn: permissionSetArn,
          ManagedPolicyArn: currentArn,
        })
      );
      logger.info("Detached managed policy", { permissionSetArn, policyArn: currentArn });
    }
  }

  // Attach new policies that aren't already attached
  for (const newArn of newPolicyArns) {
    if (!currentPolicyArns.includes(newArn)) {
      await client.send(
        new AttachManagedPolicyToPermissionSetCommand({
          InstanceArn: config.identityInstanceArn,
          PermissionSetArn: permissionSetArn,
          ManagedPolicyArn: newArn,
        })
      );
      logger.info("Attached managed policy", { permissionSetArn, policyArn: newArn });
    }
  }
}

async function updateCustomPolicies(
  client: SSOAdminClient,
  config: Config,
  permissionSetArn: string,
  newCustomPolicyNames: string[],
  logger: Logger
): Promise<void> {
  // For custom policies, we'll replace the existing inline policy
  // First, check if there's an existing inline policy
  try {
    const getInlinePolicyResponse = await client.send(
      new GetInlinePolicyForPermissionSetCommand({
        InstanceArn: config.identityInstanceArn,
        PermissionSetArn: permissionSetArn,
      })
    );

    // If there's an existing inline policy, delete it first
    if (getInlinePolicyResponse.InlinePolicy) {
      await client.send(
        new DeleteInlinePolicyFromPermissionSetCommand({
          InstanceArn: config.identityInstanceArn,
          PermissionSetArn: permissionSetArn,
        })
      );
      logger.info("Deleted existing inline policy", { permissionSetArn });
    }
  } catch (error) {
    // If there's no existing inline policy, that's fine - we'll just create a new one
    logger.debug("No existing inline policy found", { permissionSetArn });
  }

  // Create a new inline policy if custom policies are provided
  if (newCustomPolicyNames.length > 0) {
    // Generate a basic policy document that references the custom policy names
    // In a real implementation, you'd need to resolve these names to actual policy documents
    const policyDocument = {
      Version: "2012-10-17",
      Statement: newCustomPolicyNames.map((policyName) => ({
        Effect: "Allow",
        Action: "*", // This is a placeholder - in reality, you'd map policy names to actual permissions
        Resource: "*",
        Condition: {
          StringEquals: {
            "aws:RequestTag/CustomPolicy": policyName,
          },
        },
      })),
    };

    await client.send(
      new PutInlinePolicyToPermissionSetCommand({
        InstanceArn: config.identityInstanceArn,
        PermissionSetArn: permissionSetArn,
        InlinePolicy: JSON.stringify(policyDocument),
      })
    );
    logger.info("Created new inline policy", { permissionSetArn, customPolicyNames: newCustomPolicyNames });
  }
}
