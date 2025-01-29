"use client";
import { listResourceOutlines } from "@/client-lib/api-clients/resource";
import { ResourceOutline } from "@/type";
import { InputResource } from "@stamp-lib/stamp-types/models";
import { CaretSortIcon, CheckIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Button, Flex, Popover, Text, useThemeContext } from "@radix-ui/themes";
import React from "react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../combobox/command";

export type SelectInputResources = (InputResource & { resourceName: string })[];

export function InputResources({ selectInputResources, catalogId }: { selectInputResources: SelectInputResources; catalogId: string }) {
  const reverseSelectInputResources = selectInputResources.slice().reverse();
  return <RecursiveSelectInputResources reverseSelectInputResources={reverseSelectInputResources} catalogId={catalogId} setSelectedResourceId={() => {}} />;
}

function RecursiveSelectInputResources({
  reverseSelectInputResources,
  catalogId,
  setSelectedResourceId,
}: {
  reverseSelectInputResources: SelectInputResources;
  catalogId: string;
  setSelectedResourceId: React.Dispatch<React.SetStateAction<string | undefined>>;
}) {
  const [parentInputResourceId, setParentInputResourceId] = React.useState<string | undefined>(undefined);
  const [resources, setResources] = React.useState<Array<ResourceOutline> | undefined>(undefined);
  const currentAccentColor = useThemeContext().accentColor;
  const selectInputResource = reverseSelectInputResources[0];
  const [openPopover, setPopoverOpen] = React.useState(false);
  const [selectedItemId, setSelectedId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!selectInputResource) {
      return;
    }

    if (selectInputResource.parentResourceTypeId) {
      if (parentInputResourceId) {
        listResourceOutlines({ catalogId, resourceTypeId: selectInputResource.resourceTypeId, parentResourceId: parentInputResourceId }).then((r) => {
          setResources(r);
        });
      }
    } else {
      listResourceOutlines({ catalogId, resourceTypeId: selectInputResource.resourceTypeId }).then((r) => {
        setResources(r);
      });
    }
  }, [selectInputResource, catalogId, parentInputResourceId]);

  if (reverseSelectInputResources.length === 0) {
    return <React.Fragment />;
  }

  const inputResourceFromId = `inputResource_${selectInputResource.resourceTypeId}`;

  if (!resources) {
    return (
      <React.Fragment>
        <RecursiveSelectInputResources
          reverseSelectInputResources={reverseSelectInputResources.slice(1)}
          catalogId={catalogId}
          setSelectedResourceId={setParentInputResourceId}
        />
        {selectInputResource.parentResourceTypeId && !parentInputResourceId ? (
          // Display comment if there is no selected parent resource
          <label key={inputResourceFromId}>
            <Text as="div" size="3" mb="1" weight="bold">
              {selectInputResource.resourceName}
            </Text>
            <Text as="div" size="2" mb="1">
              Please select parent resource.
            </Text>
          </label>
        ) : (
          <label key={inputResourceFromId}>
            <Text as="div" size="3" mb="1" weight="bold">
              {selectInputResource.resourceName}
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
            setSelectedResourceId(selectedId);
            setSelectedId(selectedId);
          }
          setPopoverOpen(false);
        }}
      >
        <Flex align="center" px="1">
          <CheckIcon className={selectedItemId === resource.id ? "opacity-100" : "opacity-0"} />
        </Flex>
        {resource.name}
      </CommandItem>
    );
  });
  return (
    <React.Fragment>
      <RecursiveSelectInputResources
        reverseSelectInputResources={reverseSelectInputResources.slice(1)}
        catalogId={catalogId}
        setSelectedResourceId={setParentInputResourceId}
      />
      <div key={inputResourceFromId}>
        <label htmlFor={inputResourceFromId}>
          <Text as="div" size="3" mb="1" weight="bold">
            {selectInputResource.resourceName}
          </Text>
        </label>
        {selectInputResource.description ? (
          <Flex p="1" align="center" gap="1">
            <Text size="2" color={currentAccentColor}>
              <InfoCircledIcon />
            </Text>
            <Text size="2" color={currentAccentColor}>
              {selectInputResource.description}
            </Text>
          </Flex>
        ) : null}
        <input type="hidden" name={inputResourceFromId} value={selectedItemId || ""} />
        <Popover.Root open={openPopover} onOpenChange={setPopoverOpen}>
          <Popover.Trigger disabled={0 < resources.length ? false : true} id={inputResourceFromId}>
            <Button color="gray" variant="surface">
              {selectedItemId ? resources.find((resource) => resource.id === selectedItemId)?.name : ""}
              <CaretSortIcon />
            </Button>
          </Popover.Trigger>
          <Popover.Content size="1">
            <Command>
              <CommandInput placeholder={`Search the ${selectInputResource.resourceName}…`} />
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
