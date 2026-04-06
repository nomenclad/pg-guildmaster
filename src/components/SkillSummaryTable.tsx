"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { SkillSummaryEntry } from "@/types/character";

interface SkillSummaryTableProps {
  entries: SkillSummaryEntry[];
  skillNames: string[];
}

function levelColor(level: number): string {
  if (level === 0) return "";
  if (level < 25) return "bg-red-900/40 text-red-300";
  if (level < 50) return "bg-orange-900/40 text-orange-300";
  if (level < 75) return "bg-yellow-900/40 text-yellow-300";
  return "bg-green-900/40 text-green-300";
}

export default function SkillSummaryTable({ entries, skillNames }: SkillSummaryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<SkillSummaryEntry>[]>(() => {
    const cols: ColumnDef<SkillSummaryEntry>[] = [
      {
        accessorKey: "characterName",
        header: "Character",
        cell: (info) => (
          <span className="font-medium whitespace-nowrap">{info.getValue() as string}</span>
        ),
        size: 150,
        enableSorting: true,
      },
    ];

    for (const skill of skillNames) {
      cols.push({
        id: skill,
        header: () => (
          <span className="text-xs whitespace-nowrap" title={skill}>
            {skill}
          </span>
        ),
        accessorFn: (row) => row.skills[skill] ?? 0,
        cell: (info) => {
          const level = info.getValue() as number;
          if (level === 0) return <span className="text-border">-</span>;
          return (
            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${levelColor(level)}`}>
              {level}
            </span>
          );
        },
        size: 70,
        enableSorting: true,
      });
    }

    return cols;
  }, [skillNames]);

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        No characters uploaded yet. Upload character.json files above to see the skill summary.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-card">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-2 py-2 text-left font-medium text-muted border-b border-border cursor-pointer hover:text-foreground select-none"
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
                <td key={cell.id} className="px-2 py-1.5 border-b border-border/50">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
