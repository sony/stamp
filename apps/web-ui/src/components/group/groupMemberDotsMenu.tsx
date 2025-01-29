"use client";
import { Flex, Text, Button, Strong, Dialog, AlertDialog, DropdownMenu } from "@radix-ui/themes";
import { useFormStatus, useFormState } from "react-dom";
import { Group, GroupMembership } from "@/type";

import { useRouter } from "next/navigation";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

import { removeMemberSubmit } from "@/server-actions/group/removeMember";

export function GroupMemberDotsMenu({ group, groupMembership, userName }: { group: Group; groupMembership: GroupMembership; userName: string }) {
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);

  // workaround for these issue
  // https://github.com/radix-ui/primitives/issues/2355
  // https://github.com/radix-ui/primitives/issues/1241#issuecomment-1888232392
  useEffect(() => {
    if (!removeMemberDialogOpen) {
      setTimeout(() => {
        document.body.style.pointerEvents = "";
      }, 500);
    }
  }, [removeMemberDialogOpen]);

  return (
    <Flex>
      <Dialog.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <DotsHorizontalIcon />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              color="red"
              disabled={removeMemberDialogOpen}
              onClick={() => {
                setRemoveMemberDialogOpen(true);
              }}
            >
              Remove member
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <RemoveModal
          group={group}
          groupMembership={groupMembership}
          userName={userName}
          modalOpen={removeMemberDialogOpen}
          setModalOpen={setRemoveMemberDialogOpen}
        />
      </Dialog.Root>
    </Flex>
  );
}

function RemoveModal({
  group,
  groupMembership,
  userName,
  modalOpen,
  setModalOpen,
}: {
  group: Group;
  groupMembership: GroupMembership;
  userName: string;
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(removeMemberSubmit, undefined);

  useEffect(() => {
    if (state?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, state, setModalOpen]);

  return (
    <AlertDialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>Remove member</AlertDialog.Title>
        <AlertDialog.Description size="2" mb="4">
          Are you sure you want to remove <Strong>{userName}</Strong> from <Strong>{group.groupName}</Strong> group?
        </AlertDialog.Description>

        <form action={formAction}>
          <input type="hidden" name="groupId" value={group.groupId} />
          <input type="hidden" name="userId" value={groupMembership.userId} />

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

            <RemoveButton />
          </Flex>
        </form>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="solid" color="red">
      {pending ? "Removing..." : "Remove"}
    </Button>
  );
}
