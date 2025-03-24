"use client";
import { Button, Dialog, Flex, RadioGroup, Section, Select, Spinner, Text, TextField, useThemeContext } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";

import { deleteGroupMemberNotificationSubmit } from "@/server-actions/group/deleteGroupMemberNotification";
import { updateGroupMemberNotificationSubmit } from "@/server-actions/group/updateGroupMemberNotification";
import { Group } from "@/type";
import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Fragment, useEffect, useState } from "react";

async function listNotificationTypes() {
  const result = await fetch("/api/notification/list");
  return (await result.json()) as StampHubRouterOutput["systemRequest"]["notification"]["listNotificationTypes"];
}

export function GroupMemberNotificationSettingModal({ group }: { group: Group }) {
  const router = useRouter();

  const [updateNotificationState, updateNotificationFormAction] = useFormState(updateGroupMemberNotificationSubmit, undefined);
  const [deleteNotificationState, deleteNotificationFormAction] = useFormState(deleteGroupMemberNotificationSubmit, undefined);

  const [notificationTypes, setNotificationTypes] = useState<StampHubRouterOutput["systemRequest"]["notification"]["listNotificationTypes"]>();

  useEffect(() => {
    listNotificationTypes().then(setNotificationTypes);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (updateNotificationState?.isSuccess === true || deleteNotificationState?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, updateNotificationState, deleteNotificationState, setModalOpen]);

  return (
    <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <Dialog.Trigger>
        <Button>Group Member Notification</Button>
      </Dialog.Trigger>{" "}
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Update Group Member Notification</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Set notification for {group.groupName} resource.
        </Dialog.Description>
        {typeof notificationTypes?.[0] === "undefined" ? (
          <label>
            {typeof notificationTypes === "undefined" ? (
              <Spinner />
            ) : (
              <Text size="2" color="red">
                No notification types available
              </Text>
            )}
          </label>
        ) : (
          <form>
            <input type="hidden" name="groupId" value={group.groupId} />

            <Section minHeight="320px" size="1">
              <NotificationPropertyForm group={group} notificationTypes={notificationTypes} />
            </Section>
            {updateNotificationState?.isSuccess === false && updateNotificationState?.message && (
              <Flex gap="3" mt="4" justify="end">
                <Text size="2" color="red">
                  {updateNotificationState.message}
                </Text>
              </Flex>
            )}

            {
              //TODO: Implement error handling
              updateNotificationState?.isSuccess === false && updateNotificationState?.message && (
                <Flex gap="3" mt="4" justify="end">
                  <Text size="2" color="red">
                    {updateNotificationState.message}
                  </Text>
                </Flex>
              )
            }
            {
              //TODO: Implement error handling
              deleteNotificationState?.isSuccess === false && deleteNotificationState?.message && (
                <Flex gap="3" mt="4" justify="end">
                  <Text size="2" color="red">
                    {deleteNotificationState.message}
                  </Text>
                </Flex>
              )
            }

            <Flex direction="column-reverse" justify="end">
              <Flex gap="3" mt="4" justify="end">
                <RequestButton updateNotificationFormAction={updateNotificationFormAction} deleteNotificationFormAction={deleteNotificationFormAction} />
              </Flex>
            </Flex>
          </form>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function NotificationPropertyForm({
  group,
  notificationTypes,
}: {
  group: Group;
  notificationTypes: StampHubRouterOutput["systemRequest"]["notification"]["listNotificationTypes"];
}) {
  const [selectedNotificationTypeId, setSelectedNotificationTypeId] = useState(
    // if groupMemberNotifications already exists, use the first one.
    group.groupMemberNotifications?.[0]?.notificationChannel.typeId || notificationTypes[0].id
  );
  const [selectedNotificationType, setSelectedNotificationType] = useState<
    StampHubRouterOutput["systemRequest"]["notification"]["listNotificationTypes"][0] | undefined
  >(notificationTypes.find((notificationType) => notificationType.id === selectedNotificationTypeId));
  const currentAccentColor = useThemeContext().accentColor;

  useEffect(() => {
    console.log("Selected Notification Type:", selectedNotificationType);
  }, [selectedNotificationType]);

  const targetNotificationProperty = group.groupMemberNotifications?.find(
    (notification) => notification.notificationChannel.typeId === selectedNotificationTypeId
  );
  return (
    <Flex direction="column" gap="3">
      <Flex direction="column" gap="1">
        <Text size="3" mb="1" weight="bold">
          Notification Type
        </Text>
        <Select.Root
          size="2"
          defaultValue={selectedNotificationTypeId}
          name="notificationTypeId"
          onValueChange={(id) => {
            setSelectedNotificationTypeId(id);
            setSelectedNotificationType(notificationTypes.find((notificationType) => notificationType.id === id));
          }}
        >
          <Select.Trigger />
          <Select.Content>
            {notificationTypes.map((notificationType) => (
              <Select.Item value={notificationType.id} key={notificationType.id}>
                {notificationType.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>
      <input type="hidden" name="groupMemberNotificationId" value={targetNotificationProperty?.id} />
      <Fragment key={selectedNotificationTypeId}>
        {selectedNotificationType?.channelConfigProperties.map((channelConfigProperty) => {
          const textFiledId = `channelConfigProperty.${channelConfigProperty.id}`;
          const inputFieldComponent = (() => {
            switch (channelConfigProperty.type) {
              case "string":
                return (
                  <TextField.Root
                    name={textFiledId}
                    id={textFiledId}
                    // Use 'as' because the case statement is checking whether it is a string type property.
                    defaultValue={targetNotificationProperty?.notificationChannel.properties[channelConfigProperty.id] as "string" | "undefined"}
                  />
                );
              case "number":
                return (
                  <TextField.Root
                    name={textFiledId}
                    id={textFiledId}
                    type="number"
                    // Use 'as' because the case statement is checking whether it is a number type property.
                    defaultValue={targetNotificationProperty?.notificationChannel.properties[channelConfigProperty.id] as "number" | "undefined"}
                  />
                );
              case "boolean":
                return (
                  <RadioGroup.Root
                    name={textFiledId}
                    id={textFiledId}
                    // Use 'as' because the case statement is checking whether it is a number type property.
                    defaultValue={(targetNotificationProperty?.notificationChannel.properties[channelConfigProperty.id] as "boolean" | "undefined")?.toString()}
                  >
                    <Flex gap="2" direction="column">
                      <Text size="2">
                        <Flex gap="2">
                          <RadioGroup.Item value="true" /> true
                        </Flex>
                      </Text>
                      <Text size="2">
                        <Flex gap="2">
                          <RadioGroup.Item value="false" /> false
                        </Flex>
                      </Text>
                    </Flex>
                  </RadioGroup.Root>
                );
            }
          })();

          return (
            <Flex direction="column" gap="1" key={channelConfigProperty.id}>
              <label htmlFor={textFiledId}>
                <Text as="div" size="3" mb="1" weight="bold">
                  {channelConfigProperty.name}
                </Text>
              </label>
              <Flex p="1" align="center" gap="1">
                <Text size="2" color={currentAccentColor}>
                  <InfoCircledIcon />
                </Text>
                <Text size="2" color={currentAccentColor}>
                  {channelConfigProperty.description}
                </Text>
              </Flex>
              {inputFieldComponent}
            </Flex>
          );
        })}
      </Fragment>
    </Flex>
  );
}

function RequestButton({
  updateNotificationFormAction,
  deleteNotificationFormAction,
}: {
  updateNotificationFormAction: (payload: FormData) => void;
  deleteNotificationFormAction: (payload: FormData) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <Dialog.Close>
        <Button variant="soft" disabled={pending} color="gray">
          Cancel
        </Button>
      </Dialog.Close>
      <Button color="red" type="submit" disabled={pending} formAction={deleteNotificationFormAction}>
        {pending ? "Requesting..." : "Delete"}
      </Button>
      <Button type="submit" disabled={pending} formAction={updateNotificationFormAction}>
        {pending ? "Requesting..." : "Update"}
      </Button>
    </>
  );
}
