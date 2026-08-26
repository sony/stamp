"use client";
import { getResource } from "@/client-lib/api-clients/resource";
import { listGroups } from "@/client-lib/api-clients/group";
import { SelectGroups } from "@/components/group/selectGroups";
import { updateRequestAccess } from "@/server-actions/resource/updateRequestAccess";
import { Group, ResourceOutline, ResourceType } from "@/type";
import { Button, Callout, Dialog, Flex, RadioGroup, Text } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type Visibility = "all" | "restricted";

export function RequestAccessSettingModal({
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
  const [state, formAction] = useActionState(updateRequestAccess, undefined);
  const [groups, setGroups] = useState<Array<Group> | undefined>(undefined);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Array<string>>([]);
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [hasOwnerOrApprover, setHasOwnerOrApprover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!modalOpen) {
      setGroups(undefined);
      setSelectedGroupIds([]);
      setVisibility("all");
      setHasOwnerOrApprover(false);
      setLoadError(undefined);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getResource({ catalogId: resourceOutline.catalogId, resourceTypeId: resourceOutline.resourceTypeId, resourceId: resourceOutline.id }),
      listGroups(),
    ])
      .then(([resource, groupList]) => {
        if (cancelled) return;
        setGroups(groupList);
        setSelectedGroupIds(resource.requesterGroupIds ?? []);
        setVisibility(resource.visibility === "restricted" ? "restricted" : "all");
        setHasOwnerOrApprover(Boolean(resource.ownerGroupId || resource.approverGroupId));
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, resourceOutline]);

  useEffect(() => {
    if (state?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, state, setModalOpen]);

  const restrictedWithoutViewers = visibility === "restricted" && selectedGroupIds.length === 0 && !hasOwnerOrApprover;

  return (
    <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <Dialog.Content style={{ maxWidth: 480 }}>
        <Dialog.Title>Request access setting</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Control who can request and who can see {resourceOutline.name}.
        </Dialog.Description>

        <form action={formAction}>
          <input type="hidden" name="catalogId" value={resourceType.catalogId} />
          <input type="hidden" name="resourceTypeId" value={resourceType.id} />
          <input type="hidden" name="resourceId" value={resourceOutline.id} />
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <SelectGroups
                name="requesterGroupIds"
                label="Requester groups"
                groups={groups}
                selectedGroupIds={selectedGroupIds}
                onChange={setSelectedGroupIds}
                emptyText="No groups selected. Anyone can request this resource."
                disabled={loading}
              />
              <Text size="1" color="gray">
                Only members of the selected groups can submit approval requests for this resource. Leave it empty to allow anyone.
              </Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="bold">
                Visibility
              </Text>
              <RadioGroup.Root name="visibility" value={visibility} onValueChange={(value) => setVisibility(value as Visibility)} disabled={loading}>
                <RadioGroup.Item value="all">All — everyone can see this resource</RadioGroup.Item>
                <RadioGroup.Item value="restricted">Restricted — only requester, approver and owner groups</RadioGroup.Item>
              </RadioGroup.Root>
              {restrictedWithoutViewers && (
                <Callout.Root color="red" size="1">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    No requester, approver or owner group is set. Only the catalog owner and the parent resource owner will be able to see this resource.
                  </Callout.Text>
                </Callout.Root>
              )}
            </Flex>
          </Flex>
          {loadError && (
            <Flex gap="3" mt="4" justify="end">
              <Text size="2" color="red">
                Failed to load current settings: {loadError}
              </Text>
            </Flex>
          )}
          {state?.isSuccess === false && state?.message && (
            <Flex gap="3" mt="4" justify="end">
              <Text size="2" color="red">
                {state.message}
              </Text>
            </Flex>
          )}
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <UpdateButton disabled={loading || loadError !== undefined} />
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function UpdateButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Updating..." : "Update"}
    </Button>
  );
}
