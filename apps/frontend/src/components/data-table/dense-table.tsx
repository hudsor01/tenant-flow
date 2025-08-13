"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Table as TanstackTable,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DenseTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  loading?: boolean
  className?: string
  onRowClick?: (row: TData) => void
  enableColumnFilters?: boolean
  enableGlobalFilter?: boolean
  enableSorting?: boolean
  enableMultiSelect?: boolean
  enablePagination?: boolean
  pageSize?: number
}

export function DenseTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  loading = false,
  className,
  onRowClick,
  enableColumnFilters = true,
  enableGlobalFilter = true,
  enableSorting = true,
  enableMultiSelect = true,
  enablePagination = true,
  pageSize = 50,
}: DenseTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      ...(enablePagination && { pagination: { pageIndex: 0, pageSize } }),
    },
    initialState: {
      pagination: enablePagination ? { pageSize } : undefined,
    },
    enableRowSelection: enableMultiSelect,
    enableMultiRowSelection: enableMultiSelect,
    enableGlobalFilter,
    enableColumnFilters,
    enableSorting,
  })

  const selectedRowsCount = table.getFilteredSelectedRowModel().rows.length
  const hasSelection = selectedRowsCount > 0

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <DenseTableSkeleton />
      </div>
    )
  }

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {enableGlobalFilter && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="h-8 w-[200px] pl-9 text-sm"
              />
            </div>
          )}
          
          {/* Column search */}
          {searchKey && (
            <Input
              placeholder={`Search ${searchKey}...`}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="h-8 w-[150px] text-sm"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Column visibility */}
          {enableColumnFilters && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-sm">
                  <Filter className="mr-1 h-3 w-3" />
                  Columns
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {hasSelection && (
        <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {selectedRowsCount} of {table.getFilteredRowModel().rows.length} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRowSelection({})}
            className="h-6 px-2 text-xs"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-background">
        <div className="relative overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border bg-muted/30">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          "h-8 px-3 text-left align-middle text-xs font-medium text-muted-foreground",
                          "border-r border-border/50 last:border-r-0",
                          "bg-muted/20 sticky top-0 z-10"
                        )}
                        style={{ width: header.getSize() }}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            header.column.getCanSort() && "cursor-pointer select-none hover:text-foreground"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())
                          }
                          {header.column.getCanSort() && (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </div>
                        
                        {/* Column resize handle */}
                        <div
                          className={cn(
                            "absolute right-0 top-0 w-1 h-full cursor-col-resize select-none bg-transparent hover:bg-primary/50 active:bg-primary",
                            "opacity-0 group-hover:opacity-100"
                          )}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                        />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(
                        "h-8 border-b border-border/30 hover:bg-muted/50 group transition-colors",
                        row.getIsSelected() && "bg-muted/30",
                        onRowClick && "cursor-pointer",
                        index % 2 === 0 && "bg-background",
                        index % 2 === 1 && "bg-muted/10"
                      )}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-3 py-1 text-xs",
                            "border-r border-border/20 last:border-r-0",
                            "truncate max-w-0"
                          )}
                          style={{ width: cell.column.getSize() }}
                        >
                          <div className="flex items-center min-h-6">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <DenseTablePagination table={table} />
      )}
    </div>
  )
}

// Helper components
function DenseTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-[200px] rounded bg-muted animate-pulse" />
          <div className="h-8 w-[150px] rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-[100px] rounded bg-muted animate-pulse" />
      </div>
      <div className="rounded-lg border">
        <div className="h-8 border-b bg-muted/30" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-8 border-b border-border/30 bg-muted/5 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

interface DenseTablePaginationProps<TData> {
  table: TanstackTable<TData>
}

function DenseTablePagination<TData>({ table }: DenseTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="text-xs text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <>
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
          </>
        )}
        {table.getFilteredRowModel().rows.length} row(s) total
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1">
          <div className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions for creating columns
export function createSelectColumn<T>() {
  return {
    id: "select",
    header: ({ table }: { table: TanstackTable<T> }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[1px]"
      />
    ),
    cell: ({ row }: { row: { getIsSelected: () => boolean; toggleSelected: (value?: boolean) => void } }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[1px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  } as ColumnDef<T>
}

export function createActionsColumn<T>(
  actions: Array<{
    label: string
    onClick: (item: T) => void
    icon?: React.ReactNode
    variant?: "default" | "destructive"
  }>
) {
  return {
    id: "actions",
    enableHiding: false,
    size: 50,
    cell: ({ row }: { row: { original: T } }) => {
      const item = row.original

      return (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 w-6 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {actions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => action.onClick(item)}
                  className={cn(
                    "text-xs",
                    action.variant === "destructive" && "text-destructive focus:text-destructive"
                  )}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  } as ColumnDef<T>
}