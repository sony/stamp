import React, { useEffect } from "react";
import { Button, Card, Flex, Popover, Text } from "@radix-ui/themes";
import { SelectInputResources } from "@/components/approval-flow/inputResource";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/combobox/command";
import { ResourceOutline } from "@/type";
import { listResourceOutlines } from "@/client-lib/api-clients/resource";

type SelectResourcesProps = {
  catalogId: string | undefined;
  inputResources: SelectInputResources | undefined;
  selectResourcesMap: Map<string, string>;
  onSelect: (resourceTypeId: string, parentResourceTypeId: string | undefined, selectedResourceId: string) => void;
};

export const SelectResources = ({ catalogId, inputResources, selectResourcesMap, onSelect }: SelectResourcesProps) => {
  // key: inputResource.parentResourceTypeId / value: Actual selected resource ID
  const [parentResourceIdsMap, setParentResourceIdsMap] = React.useState<Map<string, string>>(new Map());

  React.useEffect(() => {
    // Reset parentResourceIdsMap when selectResourcesMap is empty
    if (selectResourcesMap.size === 0) {
      setParentResourceIdsMap(new Map());
    }
  }, [selectResourcesMap]);

  if (!inputResources?.length) return null;

  const onSelectResource = (resourceTypeId: string, parentResourceTypeId: string | undefined, selectedResourceId: string) => {
    // If parent resource is selected
    if (parentResourceTypeId === undefined) {
      setParentResourceIdsMap(new Map(parentResourceIdsMap.set(resourceTypeId, selectedResourceId)));
    }

    onSelect(resourceTypeId, parentResourceTypeId, selectedResourceId);
  };

  return (
    <Flex direction="column" gap="3">
      {inputResources.map((resource) => {
        const initialValue = selectResourcesMap.get(resource.resourceTypeId) ?? "";
        return (
          <Card key={resource.resourceTypeId} variant="ghost">
            <Flex direction="column" align="start" gap="2">
              <SelectResource
                catalogId={catalogId}
                resourceName={resource.resourceName}
                resourceTypeId={resource.resourceTypeId}
                parentResourceTypeId={resource.parentResourceTypeId}
                initialValue={initialValue}
                parentResourceIdsMap={parentResourceIdsMap}
                onSelect={onSelectResource}
              />
            </Flex>
          </Card>
        );
      })}
    </Flex>
  );
};

interface SelectResourceProps {
  catalogId: string | undefined;
  resourceName: string;
  resourceTypeId: string;
  parentResourceTypeId: string | undefined;
  initialValue: string | undefined;
  parentResourceIdsMap: Map<string, string>;
  onSelect: (resourceTypeId: string, parentResourceTypeId: string | undefined, selectedResourceId: string) => void;
}

const SelectResource = ({
  catalogId,
  resourceName,
  resourceTypeId,
  parentResourceTypeId,
  initialValue,
  parentResourceIdsMap,
  onSelect,
}: SelectResourceProps) => {
  const [openPopover, setPopoverOpen] = React.useState(false);
  const [selectedItemId, setSelectedId] = React.useState<string | undefined>(undefined);
  const [resourceOutlines, setResourceOutlines] = React.useState<Array<ResourceOutline> | undefined>(undefined);

  React.useEffect(() => {
    setSelectedId(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const fetchResources = async () => {
      if (catalogId === undefined) {
        return;
      }
      const fetchedResourceOutlines = await fetchResourceOutlines(catalogId, resourceTypeId, parentResourceTypeId, parentResourceIdsMap);
      setResourceOutlines(fetchedResourceOutlines);
    };

    fetchResources();
  }, [catalogId, resourceTypeId, parentResourceTypeId, parentResourceIdsMap]);

  if (!resourceOutlines) {
    return (
      <div key="selectResource">
        <Text as="div" size="2" mt="1">
          {`${resourceName}`}
        </Text>
        <Text as="div" size="2" mb="1">
          {parentResourceTypeId === undefined ? "Loading..." : "Please select parent resource."}
        </Text>
      </div>
    );
  }

  const handleValueChange = (selectedNameValue: string) => {
    const selectedId = resourceOutlines.find((resource) => resource.name === selectedNameValue)?.id;
    if (!selectedId) return;

    onSelect(resourceTypeId, parentResourceTypeId, selectedId);

    setSelectedId(selectedId);
    setPopoverOpen(false);
  };

  const selectItems = resourceOutlines.map((resource) => {
    return (
      <CommandItem key={resource.id} value={resource.name} onSelect={handleValueChange}>
        <Flex align="center" px="1">
          <CheckIcon className={selectedItemId === resource.id ? "opacity-100" : "opacity-0"} />
        </Flex>
        {resource.name}
      </CommandItem>
    );
  });

  return (
    <div key="selectResource">
      <label htmlFor="resourceId">
        <Text as="div" size="2" mt="1">
          {`${resourceName}`}
        </Text>
      </label>
      <Popover.Root open={openPopover} onOpenChange={setPopoverOpen}>
        <Popover.Trigger disabled={0 < resourceOutlines.length ? false : true} id="resourceId">
          <Button color="gray" variant="surface">
            <Text weight={selectedItemId ? "regular" : "light"} highContrast>
              {selectedItemId ? resourceOutlines.find((resource) => resource.id === selectedItemId)?.name : `Select a filter for ${resourceName}`}
            </Text>
            <CaretSortIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content size="1">
          <Command style={{ width: "260px" }}>
            <CommandInput placeholder={`Search the ${resourceName}…`} />
            <CommandList>
              <CommandGroup>{selectItems}</CommandGroup>
            </CommandList>
          </Command>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

const fetchResourceOutlines = async (
  catalogId: string,
  resourceTypeId: string,
  parentResourceTypeId: string | undefined,
  parentResourceIdsMap: Map<string, string>
) => {
  const params: { catalogId: string; resourceTypeId: string; parentResourceId?: string } = {
    catalogId: catalogId,
    resourceTypeId: resourceTypeId,
  };
  if (parentResourceTypeId) {
    const parentInputResourceId = parentResourceIdsMap.get(parentResourceTypeId);
    if (parentInputResourceId === undefined) {
      return;
    }
    params.parentResourceId = parentInputResourceId;
  }
  const newResourceOutlines = await listResourceOutlines(params);
  return newResourceOutlines;
};
