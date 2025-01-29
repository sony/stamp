"use client";
import { Flex, Text, Button, Grid, Box, Card, Container, Link, Heading, Separator, TextField, TextArea, Dialog, Select } from "@radix-ui/themes";
import { CreateParamFormInput } from "@/components/resource/createParam";
import { useFormStatus, useFormState } from "react-dom";
import { Group, ResourceType } from "@/type";
import { editGroupSubmit } from "@/server-actions/group/editGroup";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function EditGroupDialog({ group }: { group: Group }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [state, formAction] = useFormState(editGroupSubmit, undefined);

  useEffect(() => {
    console.log(state);
    if (state?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, state]);

  return (
    <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <Dialog.Trigger>
        <Button>Edit Group</Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Edit group</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Edit {group.groupName} group
        </Dialog.Description>

        <form action={formAction}>
          <input type="hidden" name="groupId" value={group.groupId} />
          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Group name
              </Text>
              <TextField.Root name="groupName" placeholder="Enter group name" defaultValue={group.groupName} />
            </label>
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Description
              </Text>
              <TextField.Root name="description" placeholder="Enter description" defaultValue={group.description} />
            </label>
          </Flex>
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
            <SubmitButton />
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Submitting..." : "Submit"}
    </Button>
  );
}
