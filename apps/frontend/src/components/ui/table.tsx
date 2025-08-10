"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown } from "lucide-react"
import { useKeyboardNavigation, useAnnounce } from "@/hooks/use-accessibility"
import { KEYS } from "@/lib/accessibility/a11y-utils"

interface TableProps extends React.ComponentProps<"table"> {
  caption?: string
  captionSide?: "top" | "bottom"
  summary?: string
  role?: "table" | "grid" | "treegrid"
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, caption, captionSide = "top", summary, role = "table", children, ...props }, ref) => {
    return (
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={cn("w-full caption-bottom text-sm", className)}
          role={role}
          aria-label={summary || caption}
          data-slot="table"
          {...props}
        >
          {caption && (
            <caption 
              className={cn(
                "mt-4 text-sm text-muted-foreground",
                captionSide === "top" && "caption-top mb-4 mt-0"
              )}
              data-slot="table-caption"
            >
              {caption}
            </caption>
          )}
          {children}
        </table>
      </div>
    )
  }
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentProps<"thead">
>(({ className, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn("[&_tr]:border-b", className)} 
    data-slot="table-header"
    {...props} 
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentProps<"tbody">
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    data-slot="table-body"
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentProps<"tfoot">
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    data-slot="table-footer"
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

interface TableRowProps extends React.ComponentProps<"tr"> {
  selected?: boolean
  onSelect?: () => void
  interactive?: boolean
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected, onSelect, interactive, children, onClick, onKeyDown, ...props }, ref) => {
    const isInteractive = interactive || !!onSelect || !!onClick

    const handleClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
      onSelect?.()
      onClick?.(event)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === KEYS.ENTER || event.key === KEYS.SPACE) {
        event.preventDefault()
        onSelect?.()
      }
      onKeyDown?.(event)
    }

    return (
      <tr
        ref={ref}
        className={cn(
          "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
          selected && "bg-muted",
          isInteractive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          className
        )}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? "button" : undefined}
        aria-selected={selected}
        onClick={isInteractive ? handleClick : onClick}
        onKeyDown={isInteractive ? handleKeyDown : onKeyDown}
        data-slot="table-row"
        {...props}
      >
        {children}
      </tr>
    )
  }
)
TableRow.displayName = "TableRow"

interface TableHeadProps extends React.ComponentProps<"th"> {
  sortable?: boolean
  sorted?: "asc" | "desc" | false
  onSort?: () => void
  scope?: "col" | "row" | "colgroup" | "rowgroup"
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sorted, onSort, scope = "col", onClick, onKeyDown, ...props }, ref) => {
    const announce = useAnnounce()
    
    const handleSort = () => {
      if (onSort) {
        onSort()
        // Announce sort change to screen readers
        const newDirection = sorted === "asc" ? "descending" : "ascending"
        announce(`Column sorted ${newDirection}`, "polite")
      }
    }

    const handleClick = (event: React.MouseEvent<HTMLTableCellElement>) => {
      if (sortable) {
        handleSort()
      }
      onClick?.(event)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
      if (sortable && (event.key === KEYS.ENTER || event.key === KEYS.SPACE)) {
        event.preventDefault()
        handleSort()
      }
      onKeyDown?.(event)
    }

    if (sortable) {
      return (
        <th
          ref={ref}
          scope={scope}
          className={cn(
            "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
            "cursor-pointer select-none transition-colors hover:bg-muted/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            className
          )}
          tabIndex={0}
          role="columnheader button"
          aria-sort={
            sorted === "asc" ? "ascending" : 
            sorted === "desc" ? "descending" : 
            "none"
          }
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          data-slot="table-head"
          {...props}
        >
          <div className="flex items-center gap-2">
            {children}
            <div className="flex flex-col">
              <ChevronUp 
                className={cn(
                  "h-3 w-3 transition-opacity",
                  sorted === "asc" ? "opacity-100" : "opacity-30"
                )} 
                aria-hidden="true" 
              />
              <ChevronDown 
                className={cn(
                  "h-3 w-3 transition-opacity",
                  sorted === "desc" ? "opacity-100" : "opacity-30"
                )} 
                aria-hidden="true" 
              />
            </div>
          </div>
        </th>
      )
    }

    return (
      <th
        ref={ref}
        scope={scope}
        className={cn(
          "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
          className
        )}
        data-slot="table-head"
        {...props}
      >
        {children}
      </th>
    )
  }
)
TableHead.displayName = "TableHead"

interface TableCellProps extends React.ComponentProps<"td"> {
  scope?: "row" | "col" | "colgroup" | "rowgroup"
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, scope, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      scope={scope}
      data-slot="table-cell"
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

// Accessible data table wrapper with keyboard navigation
interface DataTableProps<T = Record<string, unknown>> {
  data: T[]
  columns: Array<{
    key: string
    header: string
    accessor: (item: T) => React.ReactNode
    sortable?: boolean
    headerProps?: Omit<TableHeadProps, 'children' | 'sortable'>
    cellProps?: (item: T) => Omit<TableCellProps, 'children'>
  }>
  caption?: string
  summary?: string
  onSort?: (key: string) => void
  sortConfig?: { key: string; direction: "asc" | "desc" } | null
  onRowSelect?: (item: T, index: number) => void
  selectedRows?: Set<number>
  className?: string
  emptyMessage?: string
  loading?: boolean
  keyboardNavigation?: boolean
}

function DataTable<T = Record<string, unknown>>({
  data,
  columns,
  caption,
  summary,
  onSort,
  sortConfig,
  onRowSelect,
  selectedRows,
  className,
  emptyMessage = "No data available",
  loading = false,
  keyboardNavigation = true,
}: DataTableProps<T>) {
  const tableRef = React.useRef<HTMLTableElement>(null)
  const [focusedCell, setFocusedCell] = React.useState<{ row: number; col: number } | null>(null)
  const announce = useAnnounce()

  // Keyboard navigation for data grid
  const { currentIndex: _currentIndex, setCurrentIndex: _setCurrentIndex } = useKeyboardNavigation(
    keyboardNavigation ? data : [],
    {
      loop: true,
      orientation: "vertical",
      onActivate: (item, index) => {
        if (onRowSelect) {
          onRowSelect(item, index)
          announce(`Row ${index + 1} selected`, "polite")
        }
      },
    }
  )

  // Handle keyboard navigation within table cells
  const handleTableKeyDown = (event: React.KeyboardEvent) => {
    if (!keyboardNavigation || !focusedCell) return

    const { row, col } = focusedCell
    let newRow = row
    let newCol = col

    switch (event.key) {
      case KEYS.ARROW_UP:
        event.preventDefault()
        newRow = Math.max(0, row - 1)
        break
      case KEYS.ARROW_DOWN:
        event.preventDefault()
        newRow = Math.min(data.length - 1, row + 1)
        break
      case KEYS.ARROW_LEFT:
        event.preventDefault()
        newCol = Math.max(0, col - 1)
        break
      case KEYS.ARROW_RIGHT:
        event.preventDefault()
        newCol = Math.min(columns.length - 1, col + 1)
        break
      case KEYS.HOME:
        event.preventDefault()
        if (event.ctrlKey || event.metaKey) {
          newRow = 0
          newCol = 0
        } else {
          newCol = 0
        }
        break
      case KEYS.END:
        event.preventDefault()
        if (event.ctrlKey || event.metaKey) {
          newRow = data.length - 1
          newCol = columns.length - 1
        } else {
          newCol = columns.length - 1
        }
        break
    }

    if (newRow !== row || newCol !== col) {
      setFocusedCell({ row: newRow, col: newCol })
      // Focus the actual cell
      const cell = tableRef.current?.querySelector(
        `tbody tr:nth-child(${newRow + 1}) td:nth-child(${newCol + 1})`
      ) as HTMLElement
      cell?.focus()
    }
  }

  const handleSort = (columnKey: string) => {
    if (onSort) {
      onSort(columnKey)
    }
  }

  if (loading) {
    return (
      <div className="w-full p-8 text-center" role="status" aria-live="polite">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading table data...</span>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full p-8 text-center text-muted-foreground" role="status">
        {emptyMessage}
      </div>
    )
  }

  return (
    <Table
      ref={tableRef}
      className={className}
      caption={caption}
      summary={summary}
      role="grid"
      onKeyDown={handleTableKeyDown}
    >
      <TableHeader>
        <TableRow>
          {columns.map((column) => {
            const isCurrentSort = sortConfig?.key === column.key
            const sortDirection = isCurrentSort ? sortConfig.direction : false
            
            return (
              <TableHead
                key={column.key}
                sortable={column.sortable}
                sorted={sortDirection}
                onSort={column.sortable ? () => handleSort(column.key) : undefined}
                {...column.headerProps}
              >
                {column.header}
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, rowIndex) => (
          <TableRow
            key={rowIndex}
            selected={selectedRows?.has(rowIndex)}
            onSelect={onRowSelect ? () => onRowSelect(item, rowIndex) : undefined}
            interactive={!!onRowSelect}
            aria-rowindex={rowIndex + 2} // +2 because header is row 1
          >
            {columns.map((column, colIndex) => (
              <TableCell
                key={column.key}
                tabIndex={keyboardNavigation ? 0 : undefined}
                onFocus={() => keyboardNavigation && setFocusedCell({ row: rowIndex, col: colIndex })}
                {...column.cellProps?.(item)}
              >
                {column.accessor(item)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Accessible table pagination
interface TablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  showItemsPerPage?: boolean
  itemsPerPageOptions?: number[]
  className?: string
}

function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  itemsPerPageOptions = [10, 20, 50, 100],
  className,
}: TablePaginationProps) {
  const announce = useAnnounce()

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
      announce(`Page ${page} of ${totalPages}`, "polite")
    }
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <nav 
      className={cn("flex items-center justify-between px-2", className)}
      role="navigation"
      aria-label="Table pagination"
    >
      <div className="flex-1 text-sm text-muted-foreground" aria-live="polite">
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>
      
      <div className="flex items-center space-x-6 lg:space-x-8">
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page:
            </label>
            <select
              id="rows-per-page"
              value={itemsPerPage}
              onChange={(e) => {
                const newValue = Number(e.target.value)
                onItemsPerPageChange(newValue)
                announce(`Showing ${newValue} rows per page`, "polite")
              }}
              className="h-8 w-[70px] rounded border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            aria-label="Go to previous page"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium" aria-current="page">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            aria-label="Go to next page"
          >
            Next
          </button>
        </div>
      </div>
    </nav>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  DataTable,
  TablePagination,
}
