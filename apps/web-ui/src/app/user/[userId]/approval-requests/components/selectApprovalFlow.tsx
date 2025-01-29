import { Button, Flex, Popover, Text } from "@radix-ui/themes";
import React from "react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/combobox/command";
import { ApprovalFlow } from "@/type";

export const SelectApprovalFlow = ({
  approvalFlows,
  selectedApprovalFlowId,
  onSelect,
}: {
  approvalFlows: ApprovalFlow[];
  selectedApprovalFlowId: string | undefined;
  onSelect: (approvalFlowId: string) => void;
}) => {
  const [openPopover, setPopoverOpen] = React.useState(false);

  const selectItems = approvalFlows.map((approvalFlow) => {
    return (
      <CommandItem
        key={approvalFlow.id}
        value={approvalFlow.name}
        onSelect={(selectedNameValue: string) => {
          const selectedId = approvalFlows.find((approvalFlow) => approvalFlow.name === selectedNameValue)?.id;
          if (selectedId) {
            onSelect(selectedId);
          }
          setPopoverOpen(false);
        }}
      >
        <Flex align="center" px="1">
          <CheckIcon className={selectedApprovalFlowId === approvalFlow.id ? "opacity-100" : "opacity-0"} />
        </Flex>
        {approvalFlow.name}
      </CommandItem>
    );
  });

  return (
    <>
      {approvalFlows.length > 0 && (
        <div key="approvalFlow">
          <label htmlFor="approvalFlowId">
            <Text as="div" size="2" mb="1">
              Approval Flow
            </Text>
          </label>
          <Popover.Root open={openPopover} onOpenChange={setPopoverOpen}>
            <Popover.Trigger disabled={0 < approvalFlows.length ? false : true} id="approvalFlowId">
              <Button color="gray" variant="surface">
                <Text weight={selectedApprovalFlowId ? "regular" : "light"} highContrast>
                  {selectedApprovalFlowId
                    ? approvalFlows.find((approvalFlow) => approvalFlow.id === selectedApprovalFlowId)?.name
                    : "Select a filter for approval flow"}
                </Text>
                <CaretSortIcon />
              </Button>
            </Popover.Trigger>
            <Popover.Content size="1">
              <Command style={{ width: "230px" }}>
                <CommandInput placeholder={"Search the approval flow…"} />
                <CommandList>
                  <CommandGroup>{selectItems}</CommandGroup>
                </CommandList>
              </Command>
            </Popover.Content>
          </Popover.Root>
        </div>
      )}
    </>
  );
};
