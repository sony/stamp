import { ResultAsync } from "neverthrow";

import { GroupMemberShipProvider, GroupProvider, UserProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";

import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { DeleteGroupMemberNotificationInput } from "./input";

import { Logger } from "@stamp-lib/stamp-logger";
import { GetNotificationPluginConfig } from "@stamp-lib/stamp-types/configInterface";
import { errAsync, okAsync } from "neverthrow";
import { isAdmin } from "../../events/admin/isAdmin";
import { createCheckCanEditGroup } from "../../events/group/authz";
import { createIsGroupOwner } from "../../events/group/membership";
import { createValidateGroupId } from "../../events/group/validation";
import { createValidateRequestUserId } from "../../events/user/validation";

export const deleteGroupMemberNotification =
  (
    logger: Logger,
    userProvider: UserProvider,
    groupProvider: GroupProvider,
    groupMemberShipProvider: GroupMemberShipProvider,
    getNotificationPluginConfig: GetNotificationPluginConfig
  ) =>
  (input: DeleteGroupMemberNotificationInput): ResultAsync<Group, StampHubError> => {
    const validateRequestUserId = createValidateRequestUserId(userProvider);
    const validateGroupId = createValidateGroupId(groupProvider);

    const isGroupOwner = createIsGroupOwner(groupMemberShipProvider["get"]);
    const checkCanEditGroup = createCheckCanEditGroup(isGroupOwner, isAdmin(userProvider.get));

    return parseZodObjectAsync(input, DeleteGroupMemberNotificationInput)
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
        if (!group.groupMemberNotifications || group.groupMemberNotifications.length === 0) {
          return errAsync(new StampHubError("Target groupMemberNotifications does not exist", "Target groupMemberNotifications does not exist", "BAD_REQUEST"));
        }
        const targetGroupNotification = group.groupMemberNotifications.find((notification) => notification.id === input.notificationId);
        if (!targetGroupNotification) {
          return errAsync(
            new StampHubError(
              "Target notification ID not found in groupMemberNotifications",
              "Target notification ID not found in groupMemberNotifications",
              "BAD_REQUEST"
            )
          );
        }
        return getNotificationPluginConfig(targetGroupNotification.notificationChannel.typeId).andThen((notificationConfig) => {
          if (notificationConfig.isNone()) {
            return errAsync(
              new StampHubError(
                "Target notification type ID not found in notification plugin",
                "Target notification type ID not found in notification plugin",
                "BAD_REQUEST"
              )
            );
          }

          return okAsync({ group: group, notificationConfig: notificationConfig.value, targetGroupNotification, input: input });
        });
      })
      .andThen(({ group, notificationConfig, targetGroupNotification, input }) => {
        logger.info("notificationConfig", notificationConfig);
        return userProvider.get({ userId: input.requestUserId }).andThen((user) => {
          if (user.isNone()) {
            return errAsync(new StampHubError("Request user is not found", "Request user is not found", "BAD_REQUEST"));
          }
          return okAsync({ group: group, notificationConfig: notificationConfig, targetGroupNotification, user: user.value, input: input });
        });
      })
      .andThen(({ group, notificationConfig, targetGroupNotification, user, input }) => {
        const message = `${user.userName}(${user.email}) delete group member notification for ${group.groupName}`;
        return notificationConfig.handlers.unsetChannel({ id: targetGroupNotification.notificationChannel.id, message }).andThen(() => {
          return okAsync(input);
        });
      })
      .andThen(groupProvider.deleteGroupMemberNotification)
      .mapErr(convertStampHubError);
  };
