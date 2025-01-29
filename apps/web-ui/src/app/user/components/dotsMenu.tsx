"use client";
import { Flex, Text, Button, Strong, Dialog, AlertDialog, DropdownMenu, IconButton } from "@radix-ui/themes";
import { useFormStatus, useFormState } from "react-dom";

import { useRouter } from "next/navigation";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

import { DeleteUserSubmit } from "@/server-actions/user/deleteUser";

export function UserDotsMenu({ userId, userName }: { userId: string; userName: string }) {
  const [isDeleteUserDialogVisible, setIsDeleteUserDialogVisible] = useState(false);

  // workaround for these issue
  // https://github.com/radix-ui/primitives/issues/2355
  // https://github.com/radix-ui/primitives/issues/1241#issuecomment-1888232392
  useEffect(() => {
    if (!isDeleteUserDialogVisible) {
      setTimeout(() => {
        document.body.style.pointerEvents = "";
      }, 500);
    }
  }, [isDeleteUserDialogVisible]);

  return (
    <Flex>
      <Dialog.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="ghost" aria-label="Open menu">
              <DotsHorizontalIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              color="red"
              disabled={isDeleteUserDialogVisible}
              onClick={() => {
                setIsDeleteUserDialogVisible(true);
              }}
            >
              DeleteUser
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <UserDeleteModal userId={userId} userName={userName} modalOpen={isDeleteUserDialogVisible} setModalOpen={setIsDeleteUserDialogVisible} />
      </Dialog.Root>
    </Flex>
  );
}

function UserDeleteModal({
  userId,
  userName,
  modalOpen,
  setModalOpen,
}: {
  userId: string;
  userName: string;
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(DeleteUserSubmit, undefined);

  useEffect(() => {
    if (state?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, state, setModalOpen]);

  return (
    <AlertDialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>Delete member</AlertDialog.Title>
        <AlertDialog.Description size="2" mb="4"></AlertDialog.Description>
        Are you sure you want to delete <Strong>{userName}</Strong>?
        <form action={formAction}>
          <input type="hidden" name="userId" value={userId} />
          {state?.isSuccess === false && state?.message && (
            <Flex gap="3" mt="4" justify="end">
              <Text size="2" color="red">
                {state.message}
              </Text>
            </Flex>
          )}
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

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="solid" color="red">
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}
