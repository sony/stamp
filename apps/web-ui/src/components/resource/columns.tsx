"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Link2Icon, CaretSortIcon } from "@radix-ui/react-icons";
import { Flex, Link, Button, Text } from "@radix-ui/themes";
import { ResourceType, ResourceOutline } from "@/type";
import { ResourceInfoDialog } from "@/components/resource/resourceInfoDialog";
import { DotsMenu } from "@/components/resource/dotsMenu";

export type Resource = {
  resourceType: ResourceType;
  resourceOutline: ResourceOutline;
};

export const columns: ColumnDef<Resource>[] = [
  {
    id: "name",
    accessorKey: "resourceOutline.name",
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
      return <ResourceInfoDialog resourceType={row.original.resourceType} resourceOutline={row.original.resourceOutline} />;
    },
  },
  {
    accessorKey: "resourceOutline.id",
    header: "Resource ID",
  },
  {
    id: "parentResourceId",
    accessorKey: "resourceOutline.parentResourceId",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          <Text weight="bold" highContrast>
            Parent Resource ID
          </Text>
          <CaretSortIcon />
        </Button>
      );
    },
    cell: ({ row }) => {
      return row.original.resourceOutline.parentResourceId;
    },
  },
  {
    accessorKey: "audit",
    header: "Link",
    cell: ({ row }) => {
      const catalogId = row.original.resourceType.catalogId;
      const resourceTypeId = row.original.resourceType.id;
      const resourceOutlineId = row.original.resourceOutline.id;
      return (
        <Link
          href={`/catalog/${encodeURIComponent(catalogId)}/resource-type/${encodeURIComponent(resourceTypeId)}/${encodeURIComponent(resourceOutlineId)}/audit`}
        >
          <Flex direction="row" gap="1" align="center">
            <Text size="2">Audit</Text>
            <Link2Icon />
          </Flex>
        </Link>
      );
    },
  },
  {
    id: "dotsMenu",
    cell: ({ row }) => {
      const resourceType = row.original.resourceType;
      const resourceOutline = row.original.resourceOutline;
      return (
        <Flex justify="end">
          <DotsMenu resourceType={resourceType} resourceOutline={resourceOutline} />
        </Flex>
      );
    },
  },
];
