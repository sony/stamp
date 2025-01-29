import { Logger } from "@stamp-lib/stamp-logger";
import { GetNotificationPluginConfig } from "@stamp-lib/stamp-types/configInterface";
import { GroupMemberShip, GroupMemberShipProvider, GroupProvider, UserProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../error";
import { isAdmin } from "../../events/admin/isAdmin";
import { createCheckCanEditGroup } from "../../events/group/authz";
import { createIsGroupOwner } from "../../events/group/membership";
import { createCheckTargetUserNotInGroup, createValidateGroupId } from "../../events/group/validation";
import { createValidateRequestUserId, createValidateTargetUserId } from "../../events/user/validation";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { AddUserToGroupInput } from "./input";

const MaxGroupMemberShipPerGroup = 1000;

export const addUserToGroup =
  (
    logger: Logger,
    userProvider: UserProvider,
    groupProvider: GroupProvider,
    groupMemberShipProvider: GroupMemberShipProvider,
    getNotificationPluginConfig: GetNotificationPluginConfig
  ) =>
  (input: AddUserToGroupInput): ResultAsync<GroupMemberShip, StampHubError> => {
    const validateTargetUserId = createValidateTargetUserId(userProvider);
    const validateRequestUserId = createValidateRequestUserId(userProvider);
    const validateGroup = createValidateGroupId(groupProvider);

    const isGroupOwner = createIsGroupOwner(groupMemberShipProvider["get"]);

    const checkCanEditGroup = createCheckCanEditGroup(isGroupOwner, isAdmin(userProvider["get"]));

    const checkTargetUserNotInGroup = createCheckTargetUserNotInGroup(groupMemberShipProvider);

    return parseZodObjectAsync(input, AddUserToGroupInput)
      .andThen(validateTargetUserId)
      .andThen(validateRequestUserId)
      .andThen(validateGroup)
      .andThen(checkCanEditGroup)
      .andThen(checkTargetUserNotInGroup)
      .andThen((input) => {
        //check group member ship limit
        return groupMemberShipProvider.count({ groupId: input.groupId }).andThen((count) => {
          if (count >= MaxGroupMemberShipPerGroup) {
            return errAsync(new StampHubError("Group member ship limit reached", "Group Member Ship Limit Reached", "BAD_REQUEST"));
          } else {
            return okAsync(input);
          }
        });
      })
      .andThen((input) => {
        return groupMemberShipProvider.create({ groupId: input.groupId, userId: input.targetUserId, role: input.role });
      })
      .andThen((groupMemberShip) => {
        return groupProvider
          .get({ groupId: input.groupId })
          .andThen((group) => {
            if (group.isNone()) {
              return errAsync(new StampHubError("Group not found", "Group not found", "BAD_REQUEST"));
            }

            return okAsync({ groupMemberShip: groupMemberShip, group: group.value });
          })
          .andThen(({ groupMemberShip, group }) => {
            if (!group.groupMemberNotifications || group.groupMemberNotifications.length === 0) {
              // If no group member notification, do not notification
              return okAsync(groupMemberShip);
            }

            // get notification (now only one at most)
            const notificationChannel = group.groupMemberNotifications[0].notificationChannel;
            return getNotificationPluginConfig(notificationChannel.typeId).andThen((notificationConfig) => {
              if (notificationConfig.isNone()) {
                // Output error log and continue
                logger.error("The group has a GroupMemberNotifications setting, but notification type ID not found in notification plugin");
                return okAsync(groupMemberShip);
              }

              // get request user
              return userProvider
                .get({ userId: input.requestUserId })
                .andThen((user) => {
                  if (user.isNone()) {
                    return errAsync(new StampHubError("Request user is not found", "Request user is not found", "BAD_REQUEST"));
                  }
                  return okAsync({
                    group: group,
                    notificationChannel: notificationChannel,
                    notificationConfig: notificationConfig.value,
                    requestUser: user.value,
                  });
                })
                .andThen(({ group, notificationChannel, notificationConfig, requestUser }) => {
                  // get add target user
                  return userProvider.get({ userId: input.targetUserId }).andThen((user) => {
                    if (user.isNone()) {
                      return errAsync(new StampHubError("Target user is not found", "Target user is not found", "BAD_REQUEST"));
                    }
                    return okAsync({
                      group: group,
                      notificationChannel: notificationChannel,
                      notificationConfig: notificationConfig,
                      requestUser: requestUser,
                      targetUser: user.value,
                    });
                  });
                })
                .andThen(({ group, notificationChannel, notificationConfig, requestUser, targetUser }) => {
                  return notificationConfig.handlers
                    .sendNotification({
                      message: {
                        type: "GroupMemberAddedEvent",
                        property: {
                          groupId: group.groupId,
                          groupName: group.groupName,
                          addedUserId: input.targetUserId,
                          addedUserName: `${targetUser.userName} (email: ${targetUser.email})`,
                          timeStamp: new Date().toISOString(),
                          requesterUserId: requestUser.userId,
                          requesterUserName: `${requestUser.userName} (email: ${requestUser.email})`,
                        },
                      },
                      channel: notificationChannel,
                    })
                    .andThen(() => {
                      return okAsync(groupMemberShip);
                    })
                    .orElse((error) => {
                      // Output error log and return success result
                      logger.error("Failed to send notification for user is added to group", error);
                      return okAsync(groupMemberShip);
                    });
                });
            });
          });
      })
      .mapErr(convertStampHubError);
  };

export type AddUserToGroup = typeof addUserToGroup;
