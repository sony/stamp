"use client";
import { Flex, Text, Button, Grid, Box, Card, Container, Link, Heading, Separator, TextField, TextArea, Dialog, Checkbox, AlertDialog } from "@radix-ui/themes";
import { CreateParamFormInput } from "@/components/resource/createParam";
import { useFormStatus, useFormState } from "react-dom";
import { Group, ResourceType } from "@/type";
import { deleteGroupSubmit } from "@/server-actions/group/deleteGroup";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DeleteGroupDialog({ group }: { group: Group }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [state, formAction] = useFormState(deleteGroupSubmit, undefined);

  return (
    <AlertDialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <AlertDialog.Trigger>
        <Button>Delete Group</Button>
      </AlertDialog.Trigger>

      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>Delete {group.groupName}</AlertDialog.Title>
        <AlertDialog.Description size="2" mb="4">
          Are you sure you want to delete {group.groupName} group?
        </AlertDialog.Description>

        <form action={formAction}>
          <input type="hidden" name="groupId" value={group.groupId} />

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

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="solid" color="red">
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}
