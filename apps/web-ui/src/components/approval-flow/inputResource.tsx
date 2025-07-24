"use client";
import { listResourceOutlines } from "@/client-lib/api-clients/resource";
import { ResourceOutline } from "@/type";
import { CaretSortIcon, CheckIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Button, Flex, Popover, Text, useThemeContext } from "@radix-ui/themes";
import { InputResource } from "@stamp-lib/stamp-types/models";
import React from "react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../combobox/command";

export type InputResourceSelectorItem = InputResource & { resourceName: string };
export type InputResourceSelectorItems = InputResourceSelectorItem[];

type SelectedResourceIdsByType = Record<string, string>;

export function InputResourceSelectorList({
  inputResourceSelectorItems,
  catalogId,
}: {
  inputResourceSelectorItems: InputResourceSelectorItems;
  catalogId: string;
}) {
  // State to manage the selected parent resource ID for each resourceTypeId
  const [selectedIdsByResourceTypeId, setSelectedIdsByResourceTypeId] = React.useState<SelectedResourceIdsByType>({});
  return (
    <React.Fragment>
      {inputResourceSelectorItems.map((inputResourceSelectorItem) => {
        return (
          <InputResourceSelector
            key={inputResourceSelectorItem.resourceTypeId}
            inputResourceSelectorItem={inputResourceSelectorItem}
            catalogId={catalogId}
            selectedIdsByResourceTypeId={selectedIdsByResourceTypeId}
            setSelectedIdsByResourceTypeId={setSelectedIdsByResourceTypeId}
          />
        );
      })}
    </React.Fragment>
  );
}

function InputResourceSelector({
  inputResourceSelectorItem,
  catalogId,
  selectedIdsByResourceTypeId,
  setSelectedIdsByResourceTypeId,
}: {
  inputResourceSelectorItem: InputResourceSelectorItem;
  catalogId: string;
  selectedIdsByResourceTypeId: SelectedResourceIdsByType;
  setSelectedIdsByResourceTypeId: React.Dispatch<React.SetStateAction<SelectedResourceIdsByType>>;
}) {
  const currentAccentColor = useThemeContext().accentColor;
  const [resources, setResources] = React.useState<Array<ResourceOutline> | undefined>(undefined);
  const [openPopover, setPopoverOpen] = React.useState(false);

  const targetResourceTypeId = inputResourceSelectorItem.resourceTypeId;
  const selectedResourceId = selectedIdsByResourceTypeId[targetResourceTypeId];

  const targetParentResourceTypeId = inputResourceSelectorItem.parentResourceTypeId;
  const parentSelectedResourceId = targetParentResourceTypeId ? selectedIdsByResourceTypeId[targetParentResourceTypeId] : undefined;

  React.useEffect(() => {
    if (targetParentResourceTypeId) {
      // Requires parent resource
      if (parentSelectedResourceId) {
        // Target parent resource selected
        listResourceOutlines({ catalogId, resourceTypeId: targetResourceTypeId, parentResourceId: parentSelectedResourceId }).then((r) => {
          setResources(r);
        });
      } else {
        // Target parent resource not selected
        setResources(undefined);
      }
    } else {
      // Does not require parent resource
      listResourceOutlines({ catalogId, resourceTypeId: targetResourceTypeId }).then((r) => {
        setResources(r);
      });
    }
  }, [targetResourceTypeId, targetParentResourceTypeId, catalogId, parentSelectedResourceId]);

  const inputResourceFromId = `inputResource_${targetResourceTypeId}`;

  if (!resources) {
    return (
      <React.Fragment>
        {targetParentResourceTypeId && !parentSelectedResourceId ? (
          // Display comment if there is no selected parent resource
          <label key={inputResourceFromId}>
            <Text as="div" size="3" mb="1" weight="bold">
              {inputResourceSelectorItem.resourceName}
            </Text>
            <Text as="div" size="2" mb="1">
              Please select parent resource.
            </Text>
          </label>
        ) : (
          <label key={inputResourceFromId}>
            <Text as="div" size="3" mb="1" weight="bold">
              {inputResourceSelectorItem.resourceName}
            </Text>
            <Text as="div" size="2" mb="1">
              Loading...
            </Text>
          </label>
        )}
      </React.Fragment>
    );
  }

  // Remove control characters and spaces from before and after string
  resources.map((resource) => {
    resource.name = resource.name.trim();
  });

  const selectItems = resources.map((resource) => {
    return (
      <CommandItem
        key={resource.id}
        value={resource.name}
        onSelect={(selectedNameValue: string) => {
          // onSelect event is passed with any leading or trailing spaces or control characters removed
          console.log(`selectedNameValue: "${selectedNameValue}"`);
          // selectedNameValue is the selected 'name' value in resources, so find the id and set it
          const selectedId = resources.find((resource) => resource.name === selectedNameValue)?.id;
          if (selectedId) {
            setSelectedIdsByResourceTypeId((prev) => ({
              ...prev,
              [inputResourceSelectorItem.resourceTypeId]: selectedId,
            }));
          }
          setPopoverOpen(false);
        }}
      >
        <Flex align="center" px="1">
          <CheckIcon className={selectedResourceId === resource.id ? "opacity-100" : "opacity-0"} />
        </Flex>
        {resource.name}
      </CommandItem>
    );
  });
  return (
    <React.Fragment>
      <div key={inputResourceFromId}>
        <label htmlFor={inputResourceFromId}>
          <Text as="div" size="3" mb="1" weight="bold">
            {inputResourceSelectorItem.resourceName}
          </Text>
        </label>
        {inputResourceSelectorItem.description ? (
          <Flex p="1" align="center" gap="1">
            <Text size="2" color={currentAccentColor}>
              <InfoCircledIcon />
            </Text>
            <Text size="2" color={currentAccentColor}>
              {inputResourceSelectorItem.description}
            </Text>
          </Flex>
        ) : null}
        <input type="hidden" name={inputResourceFromId} value={selectedResourceId || ""} />
        <Popover.Root open={openPopover} onOpenChange={setPopoverOpen}>
          <Popover.Trigger disabled={0 < resources.length ? false : true} id={inputResourceFromId}>
            <Button color="gray" variant="surface">
              {selectedResourceId ? resources.find((resource) => resource.id === selectedResourceId)?.name : ""}
              <CaretSortIcon />
            </Button>
          </Popover.Trigger>
          <Popover.Content size="1">
            <Command>
              <CommandInput placeholder={`Search the ${inputResourceSelectorItem.resourceName}…`} />
              <CommandList>
                <CommandGroup>{selectItems}</CommandGroup>
              </CommandList>
            </Command>
          </Popover.Content>
        </Popover.Root>
      </div>
    </React.Fragment>
  );
}
