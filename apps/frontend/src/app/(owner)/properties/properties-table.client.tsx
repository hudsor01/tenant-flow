'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#components/ui/card'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { DataTableColumnHeader } from '#components/data-table/data-table-column-header'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '#components/ui/dialog'
import { Badge } from '#components/ui/badge'
import { Trash2, MapPin, Plus } from 'lucide-react'
import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import type { Property } from '@repo/shared/types/core'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { useDeletePropertyMutation } from '#hooks/api/mutations/property-mutations'
import { useDataTable } from '#hooks/use-data-table'

const logger = createLogger({ component: 'PropertiesTableClient' })

// Status badge styling
const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  INactive: 'secondary',
  UNDER_CONTRACT: 'outline',
  SOLD: 'destructive'
}

// Property type display names
const typeLabels: Record<string, string> = {
  SINGLE_FAMILY: 'Single Family',
  MULTI_UNIT: 'Multi-Unit',
  APARTMENT: 'Apartment',
  CONDO: 'Condo',
  TOWNHOUSE: 'Townhouse',
  COMMERCIAL: 'Commercial',
  OTHER: 'Other'
}

interface PropertiesTableClientProps {
  initialProperties: Property[]
}

export function PropertiesTableClient({ initialProperties }: PropertiesTableClientProps) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [optimisticProperties, removeOptimistic] = useOptimistic(
    initialProperties,
    (state, property_id: string) => state.filter(p => p.id !== property_id)
  )
  const deletePropertyMutation = useDeletePropertyMutation()

  const handleDelete = (property_id: string, propertyName: string) => {
    setDeletingId(property_id)

    startTransition(() => {
      removeOptimistic(property_id)

      deletePropertyMutation.mutate(property_id, {
        onSuccess: () => {
          toast.success(`Property "${propertyName}" deleted`)
          setDeletingId(null)
        },
        onError: (error) => {
          logger.error('Delete failed', { action: 'handleDelete', metadata: { property_id, error } })
          toast.error('Failed to delete property')
          setDeletingId(null)
        }
      })
    })
  }

  // Column definitions
  const columns: ColumnDef<Property>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column= { column } label="Property Name" />
			),
  meta: {
    label: 'Property',
      variant: 'text',
        placeholder: 'Search properties...',
			},
  enableColumnFilter: true,
    cell: ({ row }) => {
      const property = row.original
      return (
        <div>
        <div className= "font-medium" > { property.name } </div>
        < div className = "text-muted flex items-center gap-1 mt-1" >
          <MapPin className="size-3" />
            { property.address_line1 }
            </div>
            </div>
				)
    }
},
{
  accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column= { column } label = "Type" />
			),
  meta: {
    label: 'Type',
      variant: 'select',
        options: Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
			},
  enableColumnFilter: true,
    cell: ({ row }) => (
      <span className= "text-sm" >
      { typeLabels[row.getValue('type') as string] || row.getValue('type') }
      </span>
			),
  filterFn: (row, id, value) => {
    return value.includes(row.getValue(id))
  }
},
{
  accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column= { column } label = "Status" />
			),
  meta: {
    label: 'Status',
      variant: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'INactive' },
          { label: 'Under Contract', value: 'UNDER_CONTRACT' },
          { label: 'Sold', value: 'SOLD' },
        ],
			},
  enableColumnFilter: true,
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge variant= { statusVariants[status] || 'outline' } >
        { status.replace('_', ' ') }
        </Badge>
				)
    },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      }
},
{
  accessorKey: 'unitCount',
    header: ({ column }) => (
      <DataTableColumnHeader column= { column } label = "Units" />
			),
  cell: ({ row }) => (
    <span className= "text-sm tabular-nums" > { row.getValue('unitCount') || 0 } </span>
			)
},
{
  id: 'actions',
    cell: ({ row }) => {
      const property = row.original
      return (
        <div className= "flex items-center justify-end gap-1" >
        <Button asChild size = "sm" variant = "ghost" >
          <Link href={ `/properties/${property.id}` }> View </Link>
            </Button>
            < Button asChild size = "sm" variant = "ghost" >
              <Link href={ `/properties/${property.id}/edit` }> Edit </Link>
                </Button>
                < AlertDialog >
                <AlertDialogTrigger asChild >
                <Button size="sm" variant = "ghost" className = "text-destructive hover:text-destructive" >
                  <Trash2 className="size-4" />
                    <span className="sr-only" > Delete </span>
                      </Button>
                      </AlertDialogTrigger>
                      < AlertDialogContent >
                      <AlertDialogHeader>
                      <AlertDialogTitle>Delete property </AlertDialogTitle>
                        <AlertDialogDescription>
										Permanently delete <strong>{ property.name } </strong> and all associated units and leases?
        </AlertDialogDescription>
        </AlertDialogHeader>
        < AlertDialogFooter >
        <AlertDialogCancel>Cancel </AlertDialogCancel>
        < AlertDialogAction
      disabled = {
        (isPending || deletePropertyMutation.isPending) && deletingId === property.id
    }
  onClick = {() => handleDelete(property.id, property.name)
}
className = "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  >
  { (isPending || deletePropertyMutation.isPending) && deletingId === property.id ? 'Deleting...' : 'Delete' }
</AlertDialogAction>
  </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>
  </div>
				)
}
		}
	]

const { table } = useDataTable({
  data: optimisticProperties,
  columns,
  pageCount: -1, // Client-side pagination
  enableAdvancedFilter: true,
  initialState: {
    pagination: {
      pageIndex: 0,
      pageSize: 10,
    },
  },
})

return (
  <Card>
  <CardHeader className= "flex-between flex-row" >
  <div>
  <CardTitle>Properties </CardTitle>
  < CardDescription > Manage your property portfolio </CardDescription>
    </div>
    < Button asChild >
      <Link href="/properties/new" >
        <Plus className="size-4" />
          Add Property
            </Link>
            </Button>
            </CardHeader>
            < CardContent >
            <DataTable table={ table }>
              <DataTableToolbar table={ table } />
                </DataTable>
                </CardContent>
                </Card>
	)
}
