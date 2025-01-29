"use client";

import { ListUser } from "@/components/group/createListUser";
import { addMemberSubmit } from "@/server-actions/group/addMember";
import { Group } from "@/type";
import { Button, Dialog, Flex, Select, Text } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

export function AddMemberDialog({ group }: { group: Group }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [state, formAction] = useFormState(addMemberSubmit, undefined);

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
        <Button>Add Member</Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Add member</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Add member to {group.groupName} group
        </Dialog.Description>

        <form action={formAction}>
          <input type="hidden" name="groupId" value={group.groupId} />
          <Flex direction="column" gap="3">
            <ListUser />
            <label key="parentResource">
              <Text as="div" size="2" mb="1" weight="bold">
                Group role
              </Text>
              <Select.Root name="role" defaultValue="member">
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="member">member</Select.Item>
                  <Select.Item value="owner">owner</Select.Item>
                </Select.Content>
              </Select.Root>
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
