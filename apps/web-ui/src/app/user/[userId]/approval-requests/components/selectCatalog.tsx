import { Button, Flex, Popover, Text } from "@radix-ui/themes";
import React from "react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/combobox/command";
import { CatalogInfo } from "@stamp-lib/stamp-types/models";

export const SelectCatalog = ({
  catalogs,
  selectedCatalogId,
  onSelect,
}: {
  catalogs: Array<CatalogInfo>;
  selectedCatalogId: string | undefined;
  onSelect: (catalogId: string) => void;
}) => {
  const [openPopover, setPopoverOpen] = React.useState(false);

  const selectItems = catalogs.map((catalog) => {
    return (
      <CommandItem
        key={catalog.id}
        value={catalog.name}
        onSelect={(selectedNameValue: string) => {
          const selectedId = catalogs.find((catalog) => catalog.name === selectedNameValue)?.id;
          if (selectedId) {
            onSelect(selectedId);
          }
          setPopoverOpen(false);
        }}
      >
        <Flex align="center" px="1">
          <CheckIcon className={selectedCatalogId === catalog.id ? "opacity-100" : "opacity-0"} />
        </Flex>
        {catalog.name}
      </CommandItem>
    );
  });

  return (
    <div key="catalog">
      <label htmlFor="catalogId">
        <Text as="div" size="2" mb="1">
          Catalog
        </Text>
      </label>
      <Popover.Root open={openPopover} onOpenChange={setPopoverOpen}>
        <Popover.Trigger disabled={0 < catalogs.length ? false : true} id="catalogId">
          <Button color="gray" variant="surface">
            <Text weight={selectedCatalogId ? "regular" : "light"} highContrast>
              {selectedCatalogId ? catalogs.find((catalog) => catalog.id === selectedCatalogId)?.name : "Select a filter for catalog"}
            </Text>
            <CaretSortIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content size="1">
          <Command style={{ width: "230px" }}>
            <CommandInput placeholder={"Search the catalog…"} />
            <CommandList>
              <CommandGroup>{selectItems}</CommandGroup>
            </CommandList>
          </Command>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};
