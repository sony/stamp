"use client";

import * as React from "react";
import {
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { Table, TextField, Select, Flex, Button, Text, Box, Em, Grid } from "@radix-ui/themes";
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { DataTableProps } from "./dataTable";

interface DataTableWithFilterProps<TData, TValue> extends DataTableProps<TData, TValue> {
  filterableColumnDisplayNameMap: Map<string, string>;
  pageSize?: number;
}

export function DataTableWithFilters<TData, TValue>({
  columns,
  data,
  columnVisibility = {},
  filterableColumnDisplayNameMap = new Map<string, string>(),
  pageSize = 10,
}: DataTableWithFilterProps<TData, TValue>) {
  let initialFilterColumnId = filterableColumnDisplayNameMap.keys().next().value;
  if (initialFilterColumnId === undefined) {
    initialFilterColumnId = "";
  }

  const [sorting, setSorting] = React.useState<SortingState>([{ desc: false, id: initialFilterColumnId }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnId, setColumnId] = React.useState(initialFilterColumnId);
  const [filterValue, setFilterValue] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    initialState: {
      columnVisibility,
      pagination: {
        pageSize,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleColumnChange = (newColumnId: string) => {
    table.getColumn(`${columnId}`)?.setFilterValue(null);
    setFilterValue("");
    setColumnId(newColumnId);
  };

  return (
    <div>
      <Flex py="4" align="start" direction="row" gap="16">
        <Select.Root value={columnId} onValueChange={handleColumnChange}>
          <Select.Trigger>
            <Flex as="span" align="center" gap="2">
              {filterableColumnDisplayNameMap.get(columnId)}
            </Flex>
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>
                <Text>Column</Text>
              </Select.Label>
              {Array.from(filterableColumnDisplayNameMap).map(([key, value]) => (
                <Select.Item key={key} value={key}>
                  <Text>{value}</Text>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
        <Flex m="1" />
        <Grid columns="2" gap="2" width="auto">
          <Box width="400px">
            <TextField.Root
              value={filterValue}
              placeholder={`Filter ${filterableColumnDisplayNameMap.get(columnId)} ...`}
              onChange={(event) => {
                table.getColumn(`${columnId}`)?.setFilterValue(event.target.value);
                setFilterValue(event.target.value);
              }}
            >
              <TextField.Slot>
                <MagnifyingGlassIcon height="16" width="16" />
              </TextField.Slot>
            </TextField.Root>
          </Box>

          <Flex as="div" direction="row" align="center" justify="end">
            <Button variant="outline" size="1" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeftIcon />
            </Button>
            <Flex m="1" />
            <Button variant="outline" size="1" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRightIcon />
            </Button>
          </Flex>
        </Grid>
      </Flex>

      <div>
        <Table.Root>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <Table.ColumnHeaderCell key={header.id}>
                      <Text>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</Text>
                    </Table.ColumnHeaderCell>
                  );
                })}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body>
            {(() => {
              const rows = table.getRowModel().rows;
              if (rows && rows.length > 0) {
                return rows.map((row) => (
                  <Table.Row key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id}>
                        <Text>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Text>
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ));
              } else {
                return (
                  <Table.Row>
                    <Table.Cell colSpan={columns.length}>
                      <Text color="gray" align="center" as="div">
                        <Em>Item does not exist.</Em>
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                );
              }
            })()}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
}
