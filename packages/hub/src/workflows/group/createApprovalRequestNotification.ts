import { ResultAsync } from "neverthrow";

import { GroupMemberShipProvider, GroupProvider, UserProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";

import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { CreateGroupMemberNotificationInput } from "./input";

import { Logger } from "@stamp-lib/stamp-logger";
import { GetNotificationPluginConfig } from "@stamp-lib/stamp-types/configInterface";
import { errAsync, okAsync } from "neverthrow";
import { isAdmin } from "../../events/admin/isAdmin";
import { createCheckCanEditGroup } from "../../events/group/authz";
import { createIsGroupOwner } from "../../events/group/membership";
import { createValidateGroupId } from "../../events/group/validation";
import { createValidateRequestUserId } from "../../events/user/validation";

export const createApprovalRequestNotification =
  (
    logger: Logger,
    userProvider: UserProvider,
    groupProvider: GroupProvider,
    groupMemberShipProvider: GroupMemberShipProvider,
    getNotificationPluginConfig: GetNotificationPluginConfig
  ) =>
  (input: CreateGroupMemberNotificationInput): ResultAsync<Group, StampHubError> => {
    const validateRequestUserId = createValidateRequestUserId(userProvider);
    const validateGroupId = createValidateGroupId(groupProvider);

    const isGroupOwner = createIsGroupOwner(groupMemberShipProvider["get"]);
    const checkCanEditGroup = createCheckCanEditGroup(isGroupOwner, isAdmin(userProvider.get));

    return parseZodObjectAsync(input, CreateGroupMemberNotificationInput)
      .andThen(validateRequestUserId)
      .andThen(validateGroupId)
      .andThen(checkCanEditGroup)
      .andThen((input) => {
        return groupProvider.get({ groupId: input.groupId }).andThen((group) => {
          if (group.isNone()) {
            return errAsync(new StampHubError("Group is not found", "Group is not found", "BAD_REQUEST"));
          }

          return okAsync({ group: group.value, input: input });
        });
      })
      .andThen(({ group, input }) => {
        return getNotificationPluginConfig(input.notificationChannel.typeId).andThen((notificationConfig) => {
          if (notificationConfig.isNone()) {
            return errAsync(
              new StampHubError(
                "Target notification type ID not found in notification plugin",
                "Target notification type ID not found in notification plugin",
                "BAD_REQUEST"
              )
            );
          }

          return okAsync({ group: group, notificationConfig: notificationConfig.value, input: input });
        });
      })
      .andThen(({ group, notificationConfig, input }) => {
        logger.info("notificationConfig", notificationConfig);
        return userProvider.get({ userId: input.requestUserId }).andThen((user) => {
          if (user.isNone()) {
            return errAsync(new StampHubError("Request user is not found", "Request user is not found", "BAD_REQUEST"));
          }
          return okAsync({ group: group, notificationConfig: notificationConfig, user: user.value, input: input });
        });
      })
      .andThen(({ group, notificationConfig, user, input }) => {
        const message = `${user.userName}(${user.email}) create approval request notification for ${group.groupName}`;
        return notificationConfig.handlers.setChannel({ properties: input.notificationChannel.properties, message }).andThen(() => {
          return okAsync(input);
        });
      })
      .andThen(groupProvider.createApprovalRequestNotification)
      .mapErr(convertStampHubError);
  };
