import { Button, Flex, Popover, Text } from "@radix-ui/themes";
import React from "react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/combobox/command";

const statusItems = [
  { value: "submitted", name: "Submitted" },
  { value: "pending", name: "Pending" },
  { value: "approved", name: "Approved" },
  { value: "rejected", name: "Rejected" },
  { value: "revoked", name: "Revoked" },
  { value: "validationFailed", name: "Validation Failed" },
  { value: "approvedActionFailed", name: "Approved Action Failed" },
  { value: "revokedActionFailed", name: "Revoked Action Failed" },
];

export const SelectStatus = ({ selectedStatus, onSelect }: { selectedStatus: string; onSelect: (status: string) => void }) => {
  const [openPopover, setPopoverOpen] = React.useState(false);

  const selectItems = statusItems.map((item) => {
    return (
      <CommandItem
        key={item.value}
        value={item.name}
        onSelect={(selectedNameValue: string) => {
          const selectedId = statusItems.find((item) => item.name === selectedNameValue)?.value;
          if (selectedId) {
            onSelect(selectedId);
          }
          setPopoverOpen(false);
        }}
      >
        <Flex align="center" px="1">
          <CheckIcon className={selectedStatus === item.value ? "opacity-100" : "opacity-0"} />
        </Flex>
        {item.name}
      </CommandItem>
    );
  });

  return (
    <div key="status">
      <label htmlFor="statusId">
        <Text as="div" size="2" mb="1">
          Status
        </Text>
      </label>
      <Popover.Root open={openPopover} onOpenChange={setPopoverOpen}>
        <Popover.Trigger disabled={0 < statusItems.length ? false : true} id="statusId">
          <Button color="gray" variant="surface">
            <Text weight={selectedStatus ? "regular" : "light"} highContrast>
              {selectedStatus ? statusItems.find((item) => item.value === selectedStatus)?.name : "Select a filter for status"}
            </Text>
            <CaretSortIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content size="1">
          <Command style={{ width: "230px" }}>
            <CommandInput placeholder={"Search the status…"} />
            <CommandList>
              <CommandGroup>{selectItems}</CommandGroup>
            </CommandList>
          </Command>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};
