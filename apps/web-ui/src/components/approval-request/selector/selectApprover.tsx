import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { Button, Flex, Popover, Text } from "@radix-ui/themes";
import React from "react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/combobox/command";

export const SelectApprover = ({
  groups,
  selectedApproverId,
  onSelect,
}: {
  groups: Array<Group>;
  selectedApproverId: string;
  onSelect: (approverId: string) => void;
}) => {
  const [openPopover, setPopoverOpen] = React.useState(false);

  const selectItems = groups.map((group) => {
    return (
      <CommandItem
        key={group.groupId}
        value={group.groupName}
        onSelect={(selectedNameValue: string) => {
          const selectedId = groups.find((group) => group.groupName === selectedNameValue)?.groupId;
          if (selectedId) {
            onSelect(selectedId);
          }
          setPopoverOpen(false);
        }}
      >
        <Flex align="center" px="1">
          <CheckIcon className={selectedApproverId === group.groupId ? "opacity-100" : "opacity-0"} />
        </Flex>
        {group.groupName}
      </CommandItem>
    );
  });

  return (
    <div key="approver">
      <label htmlFor="approverId">
        <Text as="div" size="2" mb="1">
          Approver
        </Text>
      </label>
      <Popover.Root open={openPopover} onOpenChange={setPopoverOpen}>
        <Popover.Trigger disabled={0 < groups.length ? false : true} id="approverId">
          <Button color="gray" variant="surface">
            <Text weight={selectedApproverId ? "regular" : "light"} highContrast>
              {selectedApproverId ? groups.find((group) => group.groupId === selectedApproverId)?.groupName : "Select a filter for approver"}
            </Text>
            <CaretSortIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content size="1">
          <Command style={{ width: "230px" }}>
            <CommandInput placeholder={"Search the approver group…"} />
            <CommandList>
              <CommandGroup>{selectItems}</CommandGroup>
            </CommandList>
          </Command>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};
