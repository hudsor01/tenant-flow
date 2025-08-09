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
} from "@tanstack/react-table"
import { 
  ArrowUpDown, 
  ChevronDown, 
  MoreHorizontal,
  Filter,
  Download,
  Plus
} from "lucide-react"

import { EnhancedButton as Button } from "@/components/ui/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface EnhancedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  title?: string
  description?: string
  onAdd?: () => void
  onExport?: () => void
  enableExport?: boolean
  enableAdd?: boolean
  className?: string
}

export function EnhancedDataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  title,
  description,
  onAdd,
  onExport,
  enableExport = false,
  enableAdd = false,
  className,
}: EnhancedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const selectedRowsCount = table.getFilteredSelectedRowModel().rows.length
  const totalRowsCount = table.getFilteredRowModel().rows.length

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header Section */}
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-2xl font-bold font-heading tracking-tight text-foreground">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-muted-foreground font-medium">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          {searchKey && (
            <div className="relative">
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="h-10 w-[250px] lg:w-[350px] input-modern"
              />
            </div>
          )}
          
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Filter className="mr-2 h-4 w-4" />
                Columns
                <ChevronDown className="ml-2 h-4 w-4" />
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
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-10"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          {enableAdd && (
            <Button
              onClick={onAdd}
              size="sm"
              className="h-10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New
            </Button>
          )}
        </div>
      </div>

      {/* Selection Info */}
      {selectedRowsCount > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="font-medium">
              {selectedRowsCount} selected
            </Badge>
            <span className="text-sm text-muted-foreground">
              out of {totalRowsCount} row(s)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-modern overflow-hidden">
        <Table>
          <TableHeader className="bg-gradient-subtle">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border/50 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className="font-heading font-semibold text-foreground/90 tracking-tight h-12"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())
                    }
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-border/30 hover:bg-gradient-subtle/50 transition-all duration-200"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="font-body font-medium">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell 
                  colSpan={columns.length}
                  className="h-32 text-center font-heading text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-6xl opacity-50">📭</div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">No results found</p>
                      <p className="text-sm">
                        Try adjusting your search or filters to find what you're looking for.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground font-medium">
          {selectedRowsCount > 0 && (
            <>
              <span className="font-semibold text-foreground">
                {selectedRowsCount}
              </span>
              {" "}of{" "}
            </>
          )}
          <span className="font-semibold text-foreground">
            {totalRowsCount}
          </span>
          {" "}row(s) {selectedRowsCount > 0 ? "selected" : "total"}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="font-medium"
          >
            Previous
          </Button>
          <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
          </div>
          <Button
            variant="outline" 
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="font-medium"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

// Enhanced helper functions following shadcn patterns
export function createSortableHeader<_T>(
  column: { 
    toggleSortingAction: (desc?: boolean) => void;
    getIsSortedAction: () => string | false; 
  },
  title: string,
  className?: string
) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSortingAction(column.getIsSortedAction() === "asc")}
      className={cn("h-auto p-0 font-semibold hover:bg-transparent -ml-4", className)}
    >
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

export function createActionsColumn<T>(
  onView?: (item: T) => void,
  onEdit?: (item: T) => void,
  onDelete?: (item: T) => void,
  customActions?: {
    label: string
    onClick: (item: T) => void
    icon?: React.ReactNode
    variant?: "default" | "destructive"
  }[]
) {
  return {
    id: "actions",
    enableHiding: false,
    cell: ({ row }: { row: { original: T } }) => {
      const item = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {onView && (
              <DropdownMenuItem onClick={() => onView(item)}>
                View details
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(item)}>
                Edit
              </DropdownMenuItem>
            )}
            {customActions?.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => action.onClick(item)}
                className={action.variant === "destructive" ? "text-destructive focus:text-destructive" : ""}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </DropdownMenuItem>
            ))}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(item)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }
}

// Property management specific select column
export function createSelectColumn<_T>() {
  return {
    id: "select",
    header: ({ table }: { table: { 
      getIsAllPageRowsSelected: () => boolean;
      getIsSomePageRowsSelected: () => boolean;
      toggleAllPageRowsSelected: (value: boolean) => void;
    } }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }: { row: {
      getIsSelected: () => boolean;
      toggleSelected: (value: boolean) => void;
    } }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}
