"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Link2Icon, CaretSortIcon } from "@radix-ui/react-icons";
import { Flex, Link, Button, Text } from "@radix-ui/themes";

export type Group = {
  groupId: string;
  groupName: string;
  description: string;
};

export const columns: ColumnDef<Group>[] = [
  {
    id: "groupName",
    accessorKey: "groupName",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          <Text weight="bold" highContrast>
            Name
          </Text>
          <CaretSortIcon />
        </Button>
      );
    },
    cell: ({ row }) => {
      const groupId = row.original.groupId;
      const groupName = row.original.groupName;
      return (
        <Link href={`/group/${groupId}`}>
          <Flex direction="row" gap="1" align="center">
            {groupName} <Link2Icon />
          </Flex>
        </Link>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
  },
];
