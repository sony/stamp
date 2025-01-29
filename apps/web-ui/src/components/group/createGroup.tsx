"use client";
import { Flex, Text, Button, Grid, Box, Card, Container, Link, Heading, Separator, TextField, TextArea, Dialog } from "@radix-ui/themes";
import { createGroupSubmit } from "@/server-actions/group/createGroup";
import { useFormStatus, useFormState } from "react-dom";

import React, { use } from "react";

export function CreateGroup() {
  const [state, formAction] = useFormState(createGroupSubmit, undefined);

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button>Create</Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Create Group</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create new group.
        </Dialog.Description>

        <form action={formAction}>
          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Name
              </Text>
              <TextField.Root name="name" placeholder="Enter favorite group name" />
            </label>
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Description
              </Text>
              <TextArea name="description" placeholder="Enter group description" />
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
            <CreateButton />
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create"}
    </Button>
  );
}
