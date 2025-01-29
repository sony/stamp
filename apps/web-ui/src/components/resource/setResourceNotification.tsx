"use client";
import { ResourceOutline } from "@/type";
import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { Button, Dialog, Flex, RadioGroup, Section, Select, Spinner, Text, TextField, useThemeContext } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";

import { deleteResourceNotification } from "@/server-actions/resource/deleteResourceNotification";
import { setResourceNotification } from "@/server-actions/resource/setResourceNotification";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

async function listNotificationTypes() {
  const result = await fetch("/api/notification/list");
  return (await result.json()) as StampHubRouterOutput["systemRequest"]["notification"]["listNotificationTypes"];
}

async function getResource(resourceId: string, catalogId: string, resourceTypeId: string) {
  const result = await fetch(
    `/api/resource/get?catalogId=${encodeURIComponent(catalogId)}&resourceTypeId=${encodeURIComponent(resourceTypeId)}&resourceId=${encodeURIComponent(
      resourceId
    )}`
  );
  return (await result.json()) as StampHubRouterOutput["userRequest"]["resource"]["get"];
}

export function NotificationSettingModal({
  resourceOutline,
  modalOpen,
  setModalOpen,
}: {
  resourceOutline: ResourceOutline;
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [setResourceNotificationState, setResourceNotificationFormAction] = useFormState(setResourceNotification, undefined);
  const [deleteResourceNotificationState, deleteResourceNotificationFormAction] = useFormState(deleteResourceNotification, undefined);

  const [notificationTypes, setNotificationTypes] = useState<StampHubRouterOutput["systemRequest"]["notification"]["listNotificationTypes"]>();

  useEffect(() => {
    if (modalOpen) {
      listNotificationTypes().then(setNotificationTypes);
    }
  }, [modalOpen]);

  useEffect(() => {
    if (setResourceNotificationState?.isSuccess === true || deleteResourceNotificationState?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, setResourceNotificationState, deleteResourceNotificationState, setModalOpen]);

  return (
    <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Update Audit Notification</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Set audit notification for {resourceOutline.name} resource.
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
            <input type="hidden" name="catalogId" value={resourceOutline.catalogId} />
            <input type="hidden" name="resourceTypeId" value={resourceOutline.resourceTypeId} />
            <input type="hidden" name="resourceId" value={resourceOutline.id} />

            <Section minHeight="400px" size="1">
              <NotificationPropertyForm notificationTypes={notificationTypes} resourceOutline={resourceOutline} />
            </Section>
            {setResourceNotificationState?.isSuccess === false && setResourceNotificationState?.message && (
              <Flex gap="3" mt="4" justify="end">
                <Text size="2" color="red">
                  {setResourceNotificationState.message}
                </Text>
              </Flex>
            )}

            {
              //TODO: Implement error handling
              setResourceNotificationState?.isSuccess === false && setResourceNotificationState?.message && (
                <Flex gap="3" mt="4" justify="end">
                  <Text size="2" color="red">
                    {setResourceNotificationState.message}
                  </Text>
                </Flex>
              )
            }
            {
              //TODO: Implement error handling
              deleteResourceNotificationState?.isSuccess === false && deleteResourceNotificationState?.message && (
                <Flex gap="3" mt="4" justify="end">
                  <Text size="2" color="red">
                    {deleteResourceNotificationState.message}
                  </Text>
                </Flex>
              )
            }

            <Flex direction="column-reverse" justify="end">
              <Flex gap="3" mt="4" justify="end">
                <RequestButton
                  setResourceNotificationFormAction={setResourceNotificationFormAction}
                  deleteResourceNotificationFormAction={deleteResourceNotificationFormAction}
                />
              </Flex>
            </Flex>
          </form>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function NotificationPropertyForm({
  notificationTypes,
  resourceOutline,
}: {
  notificationTypes: StampHubRouterOutput["systemRequest"]["notification"]["listNotificationTypes"];
  resourceOutline: ResourceOutline;
}) {
  const [selectedNotificationTypeId, setSelectedNotificationTypeId] = useState(notificationTypes[0]?.id);
  const [selectedNotificationType, setSelectedNotificationType] = useState<
    StampHubRouterOutput["systemRequest"]["notification"]["listNotificationTypes"][0] | undefined
  >(notificationTypes.find((notificationType) => notificationType.id === selectedNotificationTypeId));
  const [resourceInfo, setResourceInfo] = useState<StampHubRouterOutput["userRequest"]["resource"]["get"]>();
  const currentAccentColor = useThemeContext().accentColor;

  useEffect(() => {
    getResource(resourceOutline.id, resourceOutline.catalogId, resourceOutline.resourceTypeId).then((r) => {
      setResourceInfo(r);
    });
  }, [resourceOutline]);

  if (notificationTypes.length === 0) {
    return (
      <Text size="2" color="red">
        No notification types available
      </Text>
    );
  }

  // loading
  if (!resourceInfo) return <Spinner />;

  const targetNotificationProperty = resourceInfo.auditNotifications?.find(
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
      <input type="hidden" name="auditNotificationId" value={targetNotificationProperty?.id} />

      <Flex direction="column" gap="1">
        <label htmlFor="cronExpression">
          <Text as="div" size="3" mb="1" weight="bold">
            Cron Expression
          </Text>
        </label>
        <Flex p="1" align="center" gap="1">
          <Text size="2" color={currentAccentColor}>
            <InfoCircledIcon />
          </Text>
          <Text size="2" color={currentAccentColor}>
            {'Specify the time to send the notification in the cron expression format. For example, 0 12 * * ? * means "every day at 12:00 PM". '}
          </Text>
        </Flex>
        <TextField.Root name="cronExpression" id="cronExpression" defaultValue={targetNotificationProperty?.cronExpression} />
      </Flex>
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
    </Flex>
  );
}

function RequestButton({
  setResourceNotificationFormAction,
  deleteResourceNotificationFormAction,
}: {
  setResourceNotificationFormAction: (payload: FormData) => void;
  deleteResourceNotificationFormAction: (payload: FormData) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <Dialog.Close>
        <Button variant="soft" disabled={pending} color="gray">
          Cancel
        </Button>
      </Dialog.Close>
      <Button color="red" type="submit" disabled={pending} formAction={deleteResourceNotificationFormAction}>
        {pending ? "Requesting..." : "Delete"}
      </Button>
      <Button type="submit" disabled={pending} formAction={setResourceNotificationFormAction}>
        {pending ? "Requesting..." : "Update"}
      </Button>
    </>
  );
}
