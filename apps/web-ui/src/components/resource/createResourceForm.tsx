"use client";
import { Flex, Text, Button, Grid, Box, Card, Container, Link, Heading, Separator, TextField, TextArea, Dialog, Checkbox } from "@radix-ui/themes";
import { CreateParamFormInput } from "@/components/resource/createParam";
import { useFormStatus, useFormState } from "react-dom";
import { ResourceType } from "@/type";
import { createResourceSubmit } from "@/server-actions/resource/createResource";
import { useRouter } from "next/navigation";
import { SelectParentResource } from "./selectParentResource";
import { useEffect, useState } from "react";

export function CreateResourceForm({ resourceType }: { resourceType: ResourceType }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [state, formAction] = useFormState(createResourceSubmit, undefined);

  useEffect(() => {
    console.log(state);
    if (state?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, state]);

  const formInputs = [];
  for (const createParam of resourceType.createParams) {
    const createParamFormId = `createParam_${createParam.id}`;
    formInputs.push(<CreateParamFormInput createParam={createParam} key={createParamFormId} />);
  }

  if (resourceType.parentResourceTypeId) {
    formInputs.push(<SelectParentResource resourceType={resourceType} key="parentResource" />);
  }

  if (resourceType.ownerManagement) {
    formInputs.push(
      <label key="ownerGroupIdForm">
        <Text as="div" size="2" mb="1" weight="bold">
          Owner GroupId
        </Text>
        <TextField.Root name="ownerGroupId" />
      </label>
    );
  }

  if (resourceType.approverManagement) {
    formInputs.push(
      <label key="approverGroupIdForm">
        <Text as="div" size="2" mb="1" weight="bold">
          Approver GroupId
        </Text>
        <TextField.Root name="approverGroupId" />
      </label>
    );
  }

  return (
    <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <Dialog.Trigger>
        <Button>Create</Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Create {resourceType.name}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create new {resourceType.name} resource.
        </Dialog.Description>

        <form action={formAction}>
          <input type="hidden" name="catalogId" value={resourceType.catalogId} />
          <input type="hidden" name="resourceTypeId" value={resourceType.id} />
          <Flex direction="column" gap="3">
            {formInputs}
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
