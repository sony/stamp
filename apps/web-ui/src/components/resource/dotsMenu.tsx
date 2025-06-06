"use client";
import { Flex, Text, Button, Card, Container, Link, Heading, Separator, TextField, TextArea, Dialog, AlertDialog, DropdownMenu } from "@radix-ui/themes";
import { useFormStatus, useFormState } from "react-dom";
import { ResourceType, ResourceOutline } from "@/type";
import { createResourceSubmit } from "@/server-actions/resource/createResource";
import { useRouter } from "next/navigation";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { updateApproverGroup } from "@/server-actions/resource/updateApproverGroup";
import { updateOwnerGroup } from "@/server-actions/resource/updateOwnerGroup";
import { deleteResource } from "@/server-actions/resource/deleteResource";
import { NotificationSettingModal } from "./setResourceNotification";
import { ResourceEditModal } from "./resourceEditModal";

export function DotsMenu({ resourceType, resourceOutline }: { resourceType: ResourceType; resourceOutline: ResourceOutline }) {
  const isUpdatable = !resourceType.isUpdatable;
  const isDeletable = !resourceType.isDeletable;
  const isOwnerSetting = !resourceType.ownerManagement;
  const isApproverSetting = !resourceType.approverManagement;
  const [EditParamsModalOpen, setEditParamsModalOpen] = useState(false);
  const [OwnerSettingModalOpen, setOwnerSettingModalOpen] = useState(false);
  const [ApproverSettingModalOpen, setApproverSettingModalOpen] = useState(false);
  const [NotificationSettingModalOpen, setNotificationSettingModalOpen] = useState(false);
  const [DeleteModalOpen, setDeleteModalOpen] = useState(false);

  // workaround for these issue
  // https://github.com/radix-ui/primitives/issues/2355
  // https://github.com/radix-ui/primitives/issues/1241#issuecomment-1888232392
  useEffect(() => {
    if (!EditParamsModalOpen || !OwnerSettingModalOpen || !ApproverSettingModalOpen || !DeleteModalOpen) {
      setTimeout(() => {
        document.body.style.pointerEvents = "";
      }, 500);
    }
  }, [EditParamsModalOpen, OwnerSettingModalOpen, ApproverSettingModalOpen, DeleteModalOpen]);

  return (
    <Flex>
      <Dialog.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <DotsHorizontalIcon />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              disabled={isUpdatable}
              onClick={() => {
                setEditParamsModalOpen(true);
              }}
            >
              Edit params
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={isOwnerSetting}
              onClick={() => {
                setOwnerSettingModalOpen(true);
              }}
            >
              Owner Setting
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={isApproverSetting}
              onClick={() => {
                setApproverSettingModalOpen(true);
              }}
            >
              Approver Setting
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => {
                setNotificationSettingModalOpen(true);
              }}
            >
              Audit notification Setting
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              color="red"
              disabled={isDeletable}
              onClick={() => {
                setDeleteModalOpen(true);
              }}
            >
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <ResourceEditModal
          resourceType={resourceType}
          resourceOutline={resourceOutline}
          modalOpen={EditParamsModalOpen}
          setModalOpen={setEditParamsModalOpen}
        />
        <OwnerSettingModal
          resourceType={resourceType}
          resourceOutline={resourceOutline}
          modalOpen={OwnerSettingModalOpen}
          setModalOpen={setOwnerSettingModalOpen}
        />
        <ApproverSettingModal
          resourceType={resourceType}
          resourceOutline={resourceOutline}
          modalOpen={ApproverSettingModalOpen}
          setModalOpen={setApproverSettingModalOpen}
        />
        <NotificationSettingModal resourceOutline={resourceOutline} modalOpen={NotificationSettingModalOpen} setModalOpen={setNotificationSettingModalOpen} />
        <DeleteModal resourceType={resourceType} resourceOutline={resourceOutline} modalOpen={DeleteModalOpen} setModalOpen={setDeleteModalOpen} />
      </Dialog.Root>
    </Flex>
  );
}

function OwnerSettingModal({
  resourceType,
  resourceOutline,
  modalOpen,
  setModalOpen,
}: {
  resourceType: ResourceType;
  resourceOutline: ResourceOutline;
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateOwnerGroup, undefined);

  useEffect(() => {
    if (state?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, state, setModalOpen]);

  return (
    <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Update owner group</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Specify the group that can manage {resourceOutline.name} resource.
        </Dialog.Description>

        <form action={formAction}>
          <input type="hidden" name="catalogId" value={resourceType.catalogId} />
          <input type="hidden" name="resourceTypeId" value={resourceType.id} />
          <input type="hidden" name="resourceId" value={resourceOutline.id} />
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Group id
            </Text>
            <TextField.Root name="ownerGroupId" />
          </label>
          {
            //TODO: Implement error handling
            state?.isSuccess === false && state?.message && (
              <Flex gap="3" mt="4" justify="end">
                <Text size="2" color="red">
                  {state.message}
                </Text>
              </Flex>
            )
          }
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>

            <UpdateButton />
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function ApproverSettingModal({
  resourceType,
  resourceOutline,
  modalOpen,
  setModalOpen,
}: {
  resourceType: ResourceType;
  resourceOutline: ResourceOutline;
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateApproverGroup, undefined);

  useEffect(() => {
    if (state?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, state, setModalOpen]);

  return (
    <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Update approver group</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Specify the group that can arpprove {resourceOutline.name} resource.
        </Dialog.Description>

        <form action={formAction}>
          <input type="hidden" name="catalogId" value={resourceType.catalogId} />
          <input type="hidden" name="resourceTypeId" value={resourceType.id} />
          <input type="hidden" name="resourceId" value={resourceOutline.id} />
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Group id
            </Text>
            <TextField.Root name="approverGroupId" />
          </label>
          {
            //TODO: Implement error handling
            state?.isSuccess === false && state?.message && (
              <Flex gap="3" mt="4" justify="end">
                <Text size="2" color="red">
                  {state.message}
                </Text>
              </Flex>
            )
          }
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>

            <UpdateButton />
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function DeleteModal({
  resourceType,
  resourceOutline,
  modalOpen,
  setModalOpen,
}: {
  resourceType: ResourceType;
  resourceOutline: ResourceOutline;
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(deleteResource, undefined);

  useEffect(() => {
    if (state?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, state, setModalOpen]);

  return (
    <AlertDialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>Delete {resourceOutline.name}</AlertDialog.Title>
        <AlertDialog.Description size="2" mb="4">
          Are you sure you want to delete {resourceOutline.name}?
        </AlertDialog.Description>

        <form action={formAction}>
          <input type="hidden" name="catalogId" value={resourceType.catalogId} />
          <input type="hidden" name="resourceTypeId" value={resourceType.id} />
          <input type="hidden" name="resourceId" value={resourceOutline.id} />
          {
            //TODO: Implement error handling
            state?.isSuccess === false && state?.message && (
              <Flex gap="3" mt="4" justify="end">
                <Text size="2" color="red">
                  {state.message}
                </Text>
              </Flex>
            )
          }
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>

            <DeleteButton />
          </Flex>
        </form>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

function UpdateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Updating..." : "Update"}
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="solid" color="red">
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}
