"use client";
import { Flex, Text, Button, Box, Link, Heading, Dialog, Spinner, TextField, RadioGroup, Tooltip, IconButton } from "@radix-ui/themes";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { ResourceType, ResourceOutline } from "@/type";
import React, { useEffect, useState, Dispatch, SetStateAction } from "react";
import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { GroupLink } from "@/components/group/clientGroupLink";
import { updateResourceInfoParamsSubmit } from "@/server-actions/resource/updateResourceInfoParams";
import { updateResourceInfoParamsWithApprovalSubmit } from "@/server-actions/resource/updateResourceInfoParamsWithApproval";
import { cancelUpdateResourceInfoParamsSubmit } from "@/server-actions/resource/cancelUpdateResourceInfoParams";

// Enhanced StringArrayInput component for better visual appearance
function StringArrayInput({ name, id, defaultValues }: { name: string; id: string; defaultValues: string[] }) {
  const [textFields, setTextFields] = React.useState(() => {
    if (defaultValues && defaultValues.length > 0) {
      return defaultValues.map((value, index) => ({
        key: `${id}_${index}`,
        value: value,
      }));
    } else {
      return [{ key: `${id}_0`, value: "" }];
    }
  });

  const addField = () => {
    setTextFields((prevFields) => [...prevFields, { key: `${id}_${prevFields.length}`, value: "" }]);
  };

  const removeField = (indexToRemove: number) => {
    if (textFields.length > 1) {
      setTextFields((prevFields) => prevFields.filter((_, index) => index !== indexToRemove));
    }
  };

  const updateFieldValue = (index: number, value: string) => {
    setTextFields((prevFields) => prevFields.map((field, i) => (i === index ? { ...field, value } : field)));
  };

  return (
    <Flex gap="2" direction="column">
      {textFields.map((field, index) => (
        <Flex key={field.key} gap="2" align="center">
          <TextField.Root name={name} defaultValue={field.value} onChange={(e) => updateFieldValue(index, e.target.value)} style={{ flexGrow: 1 }} />
          {textFields.length > 1 && (
            <Tooltip content="Remove field">
              <IconButton radius="full" type="button" variant="soft" color="red" size="1" onClick={() => removeField(index)}>
                <TrashIcon />
              </IconButton>
            </Tooltip>
          )}
        </Flex>
      ))}
      <Flex justify="end">
        <Tooltip content="Add another field">
          <IconButton radius="full" type="button" variant="soft" size="1" onClick={addField}>
            <PlusIcon />
          </IconButton>
        </Tooltip>
      </Flex>
    </Flex>
  );
}

export function ResourceEditModal({
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
  const [updateInfoParamsState, updateInfoParamsFormAction] = useFormState(updateResourceInfoParamsSubmit, undefined);
  const [updateInfoParamsWithApprovalState, updateInfoParamsWithApprovalFormAction] = useFormState(updateResourceInfoParamsWithApprovalSubmit, undefined);
  const [cancelUpdateParamsState, cancelUpdateParamsFormAction] = useFormState(cancelUpdateResourceInfoParamsSubmit, undefined);
  const [resource, setResource] = useState<StampHubRouterOutput["userRequest"]["resource"]["get"] | undefined>(undefined);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch detailed resource information
  useEffect(() => {
    if (modalOpen) {
      setIsRedirecting(false); // Reset redirecting state when modal opens
      getResource(resourceOutline.id, resourceOutline.catalogId, resourceOutline.resourceTypeId).then((r) => {
        setResource(r);
      });
    }
  }, [modalOpen, resourceOutline]);

  useEffect(() => {
    if (updateInfoParamsState?.isSuccess === true || cancelUpdateParamsState?.isSuccess === true) {
      setModalOpen(false);
      router.refresh();
    }
  }, [router, updateInfoParamsState, cancelUpdateParamsState, setModalOpen]);

  // Handle approval request redirect
  useEffect(() => {
    if (updateInfoParamsWithApprovalState?.isSuccess === true && updateInfoParamsWithApprovalState.approvalRequestId) {
      setIsRedirecting(true);
      const redirectUrl = `/catalog/stamp-system/approval-flow/resource-update/request/${updateInfoParamsWithApprovalState.approvalRequestId}`;

      // Start the navigation
      router.push(redirectUrl);

      // Give a small delay to ensure navigation starts, then close modal
      setTimeout(() => {
        setModalOpen(false);
        setIsRedirecting(false);
      }, 1000);
    }
  }, [router, updateInfoParamsWithApprovalState, setModalOpen]);

  const hasPendingUpdate = resource?.pendingUpdateParams;
  const useApprovalFlow = resourceType.updateApprover?.approverType === "parentResource";
  const canEdit = resourceType.isUpdatable && resourceType.infoParams.some((param) => param.edit) && !hasPendingUpdate;

  return (
    <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title> {resourceOutline.name} Params</Dialog.Title>
        <Box px="2">
          {!resource ? (
            <Spinner />
          ) : hasPendingUpdate ? (
            // Show pending update status and allow cancellation
            <>
              <Flex direction="column" gap="3">
                <Box p="3" style={{ backgroundColor: "var(--yellow-2)", borderRadius: "6px", border: "1px solid var(--yellow-6)" }}>
                  <Heading size="3" mb="2" color="orange">
                    Pending Update Request
                  </Heading>
                  <Text size="2" mb="3">
                    This resource has a pending update request waiting for approval.
                  </Text>
                  <Flex gap="2" align="center" mb="2">
                    <Text size="2" weight="bold">
                      Request ID:
                    </Text>
                    <Link
                      href={`/catalog/stamp-system/approval-flow/resource-update/request/${hasPendingUpdate.approvalRequestId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {hasPendingUpdate.approvalRequestId}
                    </Link>
                  </Flex>
                  <Flex gap="2" align="center" mb="2">
                    <Text size="2" weight="bold">
                      Requested by:
                    </Text>
                    <Text size="2">{hasPendingUpdate.requestUserId}</Text>
                  </Flex>
                  <Flex gap="2" align="center">
                    <Text size="2" weight="bold">
                      Requested at:
                    </Text>
                    <Text size="2">{new Date(hasPendingUpdate.requestedAt).toLocaleString()}</Text>
                  </Flex>
                </Box>
                <InfoParams resourceType={resourceType} resourceOutline={resourceOutline} isEditable={false} />
              </Flex>

              <form>
                <input type="hidden" name="catalogId" value={resourceOutline.catalogId} />
                <input type="hidden" name="resourceTypeId" value={resourceOutline.resourceTypeId} />
                <input type="hidden" name="resourceId" value={resourceOutline.id} />
                <input type="hidden" name="approvalRequestId" value={hasPendingUpdate.approvalRequestId} />

                {cancelUpdateParamsState?.isSuccess === false && cancelUpdateParamsState?.message && (
                  <Flex gap="3" mt="4" justify="end">
                    <Text size="2" color="red">
                      {cancelUpdateParamsState.message}
                    </Text>
                  </Flex>
                )}

                <Flex gap="3" mt="2" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray">
                      Close
                    </Button>
                  </Dialog.Close>
                  <CancelRequestButton cancelUpdateParamsFormAction={cancelUpdateParamsFormAction} />
                </Flex>
              </form>
            </>
          ) : canEdit ? (
            // Show editable form
            <form>
              <input type="hidden" name="catalogId" value={resourceOutline.catalogId} />
              <input type="hidden" name="resourceTypeId" value={resourceOutline.resourceTypeId} />
              <input type="hidden" name="resourceId" value={resourceOutline.id} />
              {/* Hidden fields to indicate which parameters are arrays */}
              {resourceType.infoParams
                .filter((param) => param.type === "string[]" && param.edit)
                .map((param) => (
                  <input key={`array_marker_${param.id}`} type="hidden" name={`arrayParam_${param.id}`} value="true" />
                ))}
              <Flex direction="column" gap="3">
                <InfoParams resourceType={resourceType} resourceOutline={resourceOutline} isEditable={true} />

                {useApprovalFlow && (
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="bold">
                      Request Comment
                    </Text>
                    <TextField.Root name="comment" placeholder="Add a comment for the approval request (optional)" style={{ width: "100%" }} />
                  </Flex>
                )}
              </Flex>

              {updateInfoParamsState?.isSuccess === false && updateInfoParamsState?.message && (
                <Flex gap="3" mt="4" justify="end">
                  <Text size="2" color="red">
                    {updateInfoParamsState.message}
                  </Text>
                </Flex>
              )}

              {updateInfoParamsWithApprovalState?.isSuccess === false && updateInfoParamsWithApprovalState?.message && (
                <Flex gap="3" mt="4" justify="end">
                  <Text size="2" color="red">
                    {updateInfoParamsWithApprovalState.message}
                  </Text>
                </Flex>
              )}

              <Flex gap="3" mt="2" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray" disabled={isRedirecting}>
                    Cancel
                  </Button>
                </Dialog.Close>
                {useApprovalFlow ? (
                  <RequestWithApprovalButton
                    updateInfoParamsWithApprovalFormAction={updateInfoParamsWithApprovalFormAction}
                    setModalOpen={setModalOpen}
                    isRedirecting={isRedirecting}
                  />
                ) : (
                  <RequestButton updateInfoParamsFormAction={updateInfoParamsFormAction} />
                )}
              </Flex>
            </form>
          ) : (
            // Show read-only view
            <>
              <Flex direction="column" gap="3">
                <InfoParams resourceType={resourceType} resourceOutline={resourceOutline} isEditable={false} />
              </Flex>
              <Flex gap="3" mt="2" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Close
                  </Button>
                </Dialog.Close>
              </Flex>
            </>
          )}
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function InfoParams({ resourceType, resourceOutline, isEditable }: { resourceType: ResourceType; resourceOutline: ResourceOutline; isEditable: boolean }) {
  const InfoParamsComp = [];
  for (const infoParam of resourceType.infoParams) {
    const infoParamFromId = `infoParam_${infoParam.id}`;
    const currentValue = resourceOutline.params[infoParam.id];

    const inputComponent = (() => {
      if (!isEditable || !infoParam.edit) {
        const displayValue = Array.isArray(currentValue)
          ? currentValue.length > 0
            ? currentValue.join(", ")
            : "No values"
          : currentValue?.toString() || "No value";
        return (
          <Text
            size="2"
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--gray-2)",
              borderRadius: "4px",
              border: "1px solid var(--gray-4)",
            }}
          >
            {displayValue}
          </Text>
        );
      }

      switch (infoParam.type) {
        case "string":
          return <TextField.Root name={infoParamFromId} id={infoParamFromId} defaultValue={currentValue as string} />;
        case "number":
          return <TextField.Root name={infoParamFromId} id={infoParamFromId} type="number" defaultValue={currentValue?.toString()} />;
        case "boolean":
          return (
            <RadioGroup.Root name={infoParamFromId} id={infoParamFromId} defaultValue={currentValue?.toString()}>
              <Flex gap="2" direction="column">
                <Text size="2">
                  <Flex gap="2">
                    <RadioGroup.Item value="true" /> true
                  </Flex>
                </Text>
                <Text size="2">
                  <Flex gap="2">
                    <RadioGroup.Item value="false" /> false
                  </Flex>
                </Text>
              </Flex>
            </RadioGroup.Root>
          );
        case "string[]": {
          const arrayValue = Array.isArray(currentValue) ? currentValue : [];
          return <StringArrayInput name={infoParamFromId} id={infoParamFromId} defaultValues={arrayValue} />;
        }
        default:
          return <Text size="2">{currentValue}</Text>;
      }
    })();

    InfoParamsComp.push(
      <label key={infoParamFromId}>
        <Text as="div" size="2" mb="1" weight="bold">
          {infoParam.name}
        </Text>
        {inputComponent}
      </label>
    );
  }
  return <>{InfoParamsComp}</>;
}

async function getResource(resourceId: string, catalogId: string, resourceTypeId: string) {
  const result = await fetch(
    `/api/resource/get?catalogId=${encodeURIComponent(catalogId)}&resourceTypeId=${encodeURIComponent(resourceTypeId)}&resourceId=${encodeURIComponent(
      resourceId
    )}`
  );
  return (await result.json()) as StampHubRouterOutput["userRequest"]["resource"]["get"];
}

function RequestButton({ updateInfoParamsFormAction }: { updateInfoParamsFormAction: (payload: FormData) => void }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} formAction={updateInfoParamsFormAction}>
      {pending ? "Updating..." : "Update"}
    </Button>
  );
}

function RequestWithApprovalButton({
  updateInfoParamsWithApprovalFormAction,
  setModalOpen,
  isRedirecting,
}: {
  updateInfoParamsWithApprovalFormAction: (payload: FormData) => void;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
  isRedirecting: boolean;
}) {
  const { pending } = useFormStatus();

  const getButtonText = () => {
    if (isRedirecting) return "Redirecting...";
    if (pending) return "Requesting...";
    return "Request Update";
  };

  return (
    <Button type="submit" disabled={pending || isRedirecting} formAction={updateInfoParamsWithApprovalFormAction}>
      {getButtonText()}
    </Button>
  );
}

function CancelRequestButton({ cancelUpdateParamsFormAction }: { cancelUpdateParamsFormAction: (payload: FormData) => void }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} formAction={cancelUpdateParamsFormAction} color="red" variant="soft">
      {pending ? "Canceling..." : "Cancel Request"}
    </Button>
  );
}
