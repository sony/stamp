"use client";
import { Text, Flex, Popover, Button } from "@radix-ui/themes";
import React from "react";
import { ResourceType } from "@/type";

import { ResourceOutline } from "@/type";
import { listResourceOutlines } from "@/client-lib/api-clients/resource";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../combobox/command";

export function SelectParentResource({ resourceType }: { resourceType: ResourceType }) {
  const [parentResource, setParentResource] = React.useState<Array<ResourceOutline> | undefined>(undefined);
  const [openPopover, setPopoverOpen] = React.useState(false);
  const [selectedItemId, setSelectedId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (resourceType.parentResourceTypeId) {
      listResourceOutlines({ catalogId: resourceType.catalogId, resourceTypeId: resourceType.parentResourceTypeId }).then((r) => {
        setParentResource(r);
      });
    }
  }, [resourceType]);

  if (resourceType.parentResourceTypeId) {
    if (!parentResource) {
      return <div>Loading...</div>;
    }
    const selectItems = parentResource.map((resource) => {
      return (
        <CommandItem
          key={resource.id}
          value={resource.name}
          onSelect={(selectedNameValue: string) => {
            const selectedId = parentResource.find((resource) => resource.name === selectedNameValue)?.id;
            if (selectedId) {
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
      <div key="parentResource">
        <label htmlFor="parentResourceId">
          <Text as="div" size="2" mb="1" weight="bold">
            Parent {resourceType.parentResourceTypeId}
          </Text>
        </label>
        <input type="hidden" name="parentResourceId" value={selectedItemId || ""} />
        <Popover.Root open={openPopover} onOpenChange={setPopoverOpen}>
          <Popover.Trigger disabled={0 < parentResource.length ? false : true} id="parentResourceId">
            <Button color="gray" variant="surface">
              {selectedItemId ? parentResource.find((resource) => resource.id === selectedItemId)?.name : ""}
              <CaretSortIcon />
            </Button>
          </Popover.Trigger>
          <Popover.Content size="1">
            <Command style={{ width: "230px" }}>
              <CommandInput placeholder={"Search the parent resource…"} />
              <CommandList>
                <CommandGroup>{selectItems}</CommandGroup>
              </CommandList>
            </Command>
          </Popover.Content>
        </Popover.Root>
      </div>
    );
  }
}
