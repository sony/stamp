"use client";

import { Group } from "@/type";
import { CaretSortIcon, CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Badge, Button, Flex, IconButton, Popover, Text } from "@radix-ui/themes";
import React from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../combobox/command";

/**
 * Searchable multi-select of groups.
 * Renders one hidden input per selected group (name={name}) so a surrounding form can read them with formData.getAll(name).
 * Pure UI: the caller owns the group list and the selection.
 */
export function SelectGroups({
  name,
  groups,
  selectedGroupIds,
  onChange,
  label,
  placeholder = "Select groups…",
  emptyText,
  disabled = false,
}: {
  name: string;
  groups: Array<Group> | undefined; // undefined while loading
  selectedGroupIds: Array<string>;
  onChange: (groupIds: Array<string>) => void;
  label: string;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const [openPopover, setOpenPopover] = React.useState(false);
  const groupNameOf = (groupId: string) => groups?.find((group) => group.groupId === groupId)?.groupName;

  const toggle = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      onChange(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      onChange([...selectedGroupIds, groupId]);
    }
  };
  const remove = (groupId: string) => onChange(selectedGroupIds.filter((id) => id !== groupId));

  const isLoading = groups === undefined;
  const triggerText = isLoading ? "Loading groups…" : placeholder;

  return (
    <Flex direction="column" gap="2">
      <Text as="div" size="2" weight="bold">
        {label}
      </Text>
      {selectedGroupIds.map((groupId) => (
        <input key={groupId} type="hidden" name={name} value={groupId} />
      ))}
      {selectedGroupIds.length > 0 ? (
        <Flex wrap="wrap" gap="1">
          {selectedGroupIds.map((groupId) => {
            const groupName = groupNameOf(groupId);
            const displayName = groupName ?? `Unknown group (${groupId.slice(0, 8)}…)`;
            return (
              <Badge key={groupId} variant="soft" size="2" color={groupName ? undefined : "gray"}>
                {displayName}
                <IconButton type="button" size="1" variant="ghost" color="gray" aria-label={`Remove ${displayName}`} disabled={disabled} onClick={() => remove(groupId)}>
                  <Cross2Icon />
                </IconButton>
              </Badge>
            );
          })}
        </Flex>
      ) : (
        emptyText && (
          <Text size="2" color="gray">
            {emptyText}
          </Text>
        )
      )}
      <Popover.Root open={openPopover} onOpenChange={setOpenPopover}>
        <Popover.Trigger disabled={disabled || isLoading || groups.length === 0}>
          <Button type="button" color="gray" variant="surface">
            <Text weight="light" highContrast>
              {triggerText}
            </Text>
            <CaretSortIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content size="1">
          <Command style={{ width: "280px" }}>
            <CommandInput placeholder="Search groups…" />
            <CommandList>
              <CommandEmpty>No group found.</CommandEmpty>
              <CommandGroup>
                {(groups ?? []).map((group) => (
                  <CommandItem key={group.groupId} value={group.groupId} keywords={[group.groupName]} onSelect={(groupId: string) => toggle(groupId)}>
                    <Flex align="center" px="1">
                      <CheckIcon className={selectedGroupIds.includes(group.groupId) ? "opacity-100" : "opacity-0"} />
                    </Flex>
                    {group.groupName}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </Popover.Content>
      </Popover.Root>
      {!isLoading && groups.length === 0 && (
        <Text size="2" color="gray">
          No groups available.
        </Text>
      )}
    </Flex>
  );
}
