"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import type { RecipeEntry } from "@/types/character";

interface RecipeTableProps {
  recipes: RecipeEntry[];
  searchQuery: string;
}

export default function RecipeTable({ recipes, searchQuery }: RecipeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<RecipeEntry>[]>(
    () => [
      {
        accessorKey: "recipeName",
        header: "Recipe",
        cell: (info) => (
          <span className="font-medium">{info.getValue() as string}</span>
        ),
        size: 300,
      },
      {
        accessorKey: "skill",
        header: "Skill",
        cell: (info) => {
          const skill = info.getValue() as string | null;
          return skill ? (
            <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">
              {skill}
            </span>
          ) : (
            <span className="text-muted">-</span>
          );
        },
        size: 150,
      },
      {
        accessorKey: "knownBy",
        header: "Known By",
        cell: (info) => {
          const members = info.getValue() as string[];
          return (
            <div className="flex flex-wrap gap-1">
              {members.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 bg-success/15 text-success rounded text-xs"
                >
                  {name}
                </span>
              ))}
            </div>
          );
        },
        size: 400,
        enableSorting: false,
      },
      {
        id: "count",
        header: "# Known",
        accessorFn: (row) => row.knownBy.length,
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue() as number}</span>
        ),
        size: 80,
      },
    ],
    []
  );

  const table = useReactTable({
    data: recipes,
    columns,
    state: {
      sorting,
      globalFilter: searchQuery,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      return row.original.recipeName
        .toLowerCase()
        .includes((filterValue as string).toLowerCase());
    },
    initialState: {
      pagination: { pageSize: 50 },
    },
  });

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        No recipes found. Upload character.json files with recipe data to see results.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-card">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left font-medium text-muted border-b border-border cursor-pointer hover:text-foreground select-none"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: " \u2191",
                        desc: " \u2193",
                      }[header.column.getIsSorted() as string] ?? ""}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-card-hover transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 border-b border-border/50">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            {" \u00B7 "}
            {table.getFilteredRowModel().rows.length} recipes
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 rounded bg-card border border-border hover:bg-card-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 rounded bg-card border border-border hover:bg-card-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
