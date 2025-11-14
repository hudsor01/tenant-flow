'use client'

import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'

import { Button } from '#components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { Badge } from '#components/ui/badge'
import { DataTableColumnHeader } from '#components/ui/data-tables/data-table-column-header.jsx'

/**
 * Reusable Column Helpers for TanStack Table
 *
 * These functions create column definitions that work with any entity type.
 * Usage:
 *   const columns: ColumnDef<Property>[] = [
 *     createTextColumn("name", "Property Name", true, (row) => `/properties/${row.id}`),
 *     createBadgeColumn("status", "Status"),
 *     createActionsColumn((row) => [
 *       { label: "View", href: `/properties/${row.id}` },
 *       { label: "Edit", href: `/properties/${row.id}/edit` }
 *     ])
 *   ]
 */

// Text column with optional link
export function createTextColumn<TData>(
	accessorKey: keyof TData & string,
	title: string,
	sortable: boolean = false,
	linkFn?: (row: TData) => string
): ColumnDef<TData> {
	return {
		accessorKey,
		header: sortable
			? ({ column }) => <DataTableColumnHeader column={column} title={title} />
			: title,
		cell: ({ row }) => {
			const value = row.getValue(accessorKey) as string
			const content = <span className="font-medium">{value}</span>

			if (linkFn) {
				return (
					<Link href={linkFn(row.original)} className="hover:underline">
						{content}
					</Link>
				)
			}

			return content
		}
	}
}

// Address column (address, city, state)
export function createAddressColumn<
	TData extends {
		address?: string | null
		city?: string | null
		state?: string | null
	}
>(title: string = 'Address'): ColumnDef<TData> {
	return {
		accessorKey: 'address' as keyof TData & string,
		header: title,
		cell: ({ row }) => {
			const data = row.original
			return (
				<div className="text-sm text-muted-foreground">
					{data.address}, {data.city}, {data.state}
				</div>
			)
		}
	}
}

// Badge column with optional variant mapping
export function createBadgeColumn<TData>(
	accessorKey: keyof TData & string,
	title: string,
	variantMap?: Record<
		string,
		'default' | 'secondary' | 'destructive' | 'outline'
	>
): ColumnDef<TData> {
	return {
		accessorKey,
		header: title,
		cell: ({ row }) => {
			const value = row.getValue(accessorKey) as string
			const variant = variantMap?.[value] || 'outline'
			return <Badge variant={variant}>{value || 'N/A'}</Badge>
		}
	}
}

// Status column with predefined variants
export function createStatusColumn<TData>(
	accessorKey: keyof TData & string = 'status' as keyof TData & string,
	title: string = 'Status'
): ColumnDef<TData> {
	return createBadgeColumn(accessorKey, title, {
		ACTIVE: 'default',
		INACTIVE: 'secondary',
		DRAFT: 'outline',
		EXPIRED: 'destructive',
		TERMINATED: 'destructive',
		PENDING: 'outline',
		COMPLETED: 'default',
		CANCELLED: 'destructive'
	})
}

// Date column with formatting
export function createDateColumn<TData>(
	accessorKey: keyof TData & string,
	title: string,
	sortable: boolean = false
): ColumnDef<TData> {
	return {
		accessorKey,
		header: sortable
			? ({ column }) => <DataTableColumnHeader column={column} title={title} />
			: title,
		cell: ({ row }) => {
			const date = row.getValue(accessorKey) as string | Date | null
			if (!date) return <span className="text-muted-foreground">—</span>
			return (
				<span className="text-muted-foreground">
					{new Date(date).toLocaleDateString()}
				</span>
			)
		}
	}
}

// Number column with optional formatting
export function createNumberColumn<TData>(
	accessorKey: keyof TData & string,
	title: string,
	sortable: boolean = false,
	formatter?: (value: number) => string
): ColumnDef<TData> {
	return {
		accessorKey,
		header: sortable
			? ({ column }) => <DataTableColumnHeader column={column} title={title} />
			: title,
		cell: ({ row }) => {
			const value = row.getValue(accessorKey) as number
			const formatted = formatter ? formatter(value) : value.toString()
			return <div className="text-center">{formatted}</div>
		}
	}
}

// Actions column with dropdown menu
export interface ActionItem<TData> {
	label: string
	href?: string
	onClick?: (row: TData) => void
	separator?: boolean
}

export function createActionsColumn<TData extends { id: string }>(
	getActions: (row: TData) => ActionItem<TData>[]
): ColumnDef<TData> {
	return {
		id: 'actions',
		cell: ({ row }) => {
			const data = row.original
			const actions = getActions(data)

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="size-11 p-0">
							<span className="sr-only">Open menu</span>
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() => navigator.clipboard.writeText(data.id)}
						>
							Copy ID
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						{actions.map((action, idx) => {
							if (action.separator) {
								return <DropdownMenuSeparator key={`separator-${idx}`} />
							}

							if (action.href) {
								return (
									<DropdownMenuItem key={idx} asChild>
										<Link href={action.href}>{action.label}</Link>
									</DropdownMenuItem>
								)
							}

							return (
								<DropdownMenuItem
									key={idx}
									onClick={() => action.onClick?.(data)}
								>
									{action.label}
								</DropdownMenuItem>
							)
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			)
		}
	}
}
