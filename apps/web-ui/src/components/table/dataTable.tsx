"use client";

import * as React from "react";
import { ColumnDef, SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Table, Text, Em } from "@radix-ui/themes";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  columnVisibility?: { [columnId: string]: boolean };
}

export function DataTable<TData, TValue>({ columns, data, columnVisibility = {} }: DataTableProps<TData, TValue>) {
  let initialFilterColumnId = columns[0].id; // As an initial value, the first column will be sorted.
  if (initialFilterColumnId === undefined) {
    initialFilterColumnId = "";
  }

  const [sorting, setSorting] = React.useState<SortingState>([{ desc: false, id: initialFilterColumnId }]);

  const table = useReactTable({
    data,
    columns,
    initialState: {
      columnVisibility,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
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
  );
}
