"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown } from "lucide-react"

interface TableProps extends React.ComponentProps<"table"> {
  caption?: string
  captionSide?: "top" | "bottom"
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, caption, captionSide = "top", children, ...props }, ref) => {
    return (
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        >
          {caption && (
            <caption 
              className={cn(
                "mt-4 text-sm text-muted-foreground",
                captionSide === "top" && "caption-top mb-4 mt-0"
              )}
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
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

interface TableRowProps extends React.ComponentProps<"tr"> {
  selected?: boolean
  onSelect?: () => void
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected, onSelect, children, onClick, ...props }, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
      onSelect?.()
      onClick?.(event)
    }

    return (
      <tr
        ref={ref}
        className={cn(
          "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
          selected && "bg-muted",
          onSelect && "cursor-pointer",
          className
        )}
        onClick={onSelect ? handleClick : onClick}
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
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sorted, onSort, onClick, ...props }, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLTableCellElement>) => {
      if (sortable && onSort) {
        onSort()
      }
      onClick?.(event)
    }

    if (sortable) {
      return (
        <th
          ref={ref}
          className={cn(
            "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
            "cursor-pointer select-none transition-colors hover:bg-muted/50",
            className
          )}
          onClick={handleClick}
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
              />
              <ChevronDown 
                className={cn(
                  "h-3 w-3 transition-opacity",
                  sorted === "desc" ? "opacity-100" : "opacity-30"
                )} 
              />
            </div>
          </div>
        </th>
      )
    }

    return (
      <th
        ref={ref}
        className={cn(
          "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
          className
        )}
        {...props}
      >
        {children}
      </th>
    )
  }
)
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<HTMLTableCellElement, React.ComponentProps<"td">>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
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
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
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
}