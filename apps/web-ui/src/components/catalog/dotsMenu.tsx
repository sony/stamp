"use client";
import { Flex, Text, Button, Card, Container, Link, Heading, Separator, TextField, TextArea, Dialog, AlertDialog, DropdownMenu } from "@radix-ui/themes";
import { useFormStatus, useFormState } from "react-dom";
import { ResourceType, ResourceOutline } from "@/type";
import { createResourceSubmit } from "@/server-actions/resource/createResource";
import { useRouter } from "next/navigation";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { updateApproverGroup } from "@/server-actions/resource/updateApproverGroup";
import { updateOwnerGroup } from "@/server-actions/catalog/updateOwnerGroup";
import { deleteResource } from "@/server-actions/resource/deleteResource";
import { Catalog } from "@/type";
export function DotsMenu({ catalog }: { catalog: Catalog }) {
  const [OwnerSettingModalOpen, setOwnerSettingModalOpen] = useState(false);

  // workaround for these issue
  // https://github.com/radix-ui/primitives/issues/2355
  // https://github.com/radix-ui/primitives/issues/1241#issuecomment-1888232392
  useEffect(() => {
    if (!OwnerSettingModalOpen) {
      setTimeout(() => {
        document.body.style.pointerEvents = "";
      }, 500);
    }
  }, [OwnerSettingModalOpen]);

  return (
    <Flex>
      <Dialog.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <DotsHorizontalIcon />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              onClick={() => {
                setOwnerSettingModalOpen(true);
              }}
            >
              Owner Setting
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <OwnerSettingModal catalog={catalog} modalOpen={OwnerSettingModalOpen} setModalOpen={setOwnerSettingModalOpen} />
      </Dialog.Root>
    </Flex>
  );
}

function OwnerSettingModal({ catalog, modalOpen, setModalOpen }: { catalog: Catalog; modalOpen: boolean; setModalOpen: Dispatch<SetStateAction<boolean>> }) {
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
          Specify the group that can manage {catalog.name} catalog. This action required you have Stamp admin permission.
        </Dialog.Description>

        <form action={formAction}>
          <input type="hidden" name="catalogId" value={catalog.id} />
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

function UpdateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Updating..." : "Update"}
    </Button>
  );
}
