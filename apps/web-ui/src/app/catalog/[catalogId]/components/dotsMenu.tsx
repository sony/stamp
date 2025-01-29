"use client";
import {
  Flex,
  Text,
  Button,
  Card,
  Container,
  Link,
  Heading,
  Separator,
  TextField,
  TextArea,
  Dialog,
  AlertDialog,
  DropdownMenu,
  IconButton,
} from "@radix-ui/themes";
import { useFormStatus, useFormState } from "react-dom";
import { Catalog, ApprovalFlow } from "@/type";
import { useRouter } from "next/navigation";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { updateApproverGroup } from "@/server-actions/approval-flow/updateApproverGroup";

export function DotsMenu({ catalog, approvalFlow }: { catalog: Catalog; approvalFlow: ApprovalFlow }) {
  const [approverSettingModalOpen, setApproverSettingModalOpen] = useState(false);

  const isApproverSetting = approvalFlow.approver.approverType === "approvalFlow";

  // workaround for these issue
  // https://github.com/radix-ui/primitives/issues/2355
  // https://github.com/radix-ui/primitives/issues/1241#issuecomment-1888232392
  useEffect(() => {
    if (!approverSettingModalOpen) {
      setTimeout(() => {
        document.body.style.pointerEvents = "";
      }, 500);
    }
  }, [approverSettingModalOpen]);

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
              onClick={() => {
                setApproverSettingModalOpen(true);
              }}
              disabled={!isApproverSetting}
            >
              Approver setting
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        {isApproverSetting && (
          <ApproverSettingModal catalog={catalog} approvalFlow={approvalFlow} modalOpen={approverSettingModalOpen} setModalOpen={setApproverSettingModalOpen} />
        )}
      </Dialog.Root>
    </Flex>
  );
}

function ApproverSettingModal({
  catalog,
  approvalFlow,
  modalOpen,
  setModalOpen,
}: {
  catalog: Catalog;
  approvalFlow: ApprovalFlow;
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
          Specify the group that can approve {approvalFlow.name}. This action requires being the catalog owner.
        </Dialog.Description>
        <form action={formAction}>
          <input type="hidden" name="catalogId" value={catalog.id} />
          <input type="hidden" name="approvalFlowId" value={approvalFlow.id} />
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Group ID
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

function UpdateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Updating..." : "Update"}
    </Button>
  );
}
