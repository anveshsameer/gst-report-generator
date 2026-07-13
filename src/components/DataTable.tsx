import type { ReactNode } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[]
  data: T[]
  emptyMessage?: string
  footer?: ReactNode
}

export function DataTable<T>({ columns, data, emptyMessage = 'No data yet.', footer }: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (data.length === 0) {
    return <p className="rounded-lg border border-dashed border-stone-300 py-8 text-center text-sm text-stone-500 dark:border-stone-700">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
      <table className="w-full min-w-max text-sm">
        <thead className="bg-stone-100 dark:bg-stone-800">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap px-2 py-2 text-left font-semibold text-stone-700 dark:text-stone-200"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-2 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer}
      </table>
    </div>
  )
}
