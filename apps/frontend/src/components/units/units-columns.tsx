import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Database } from '@repo/shared'
import type { ColumnDef } from '@tanstack/react-table'

export type UnitRow = Database['public']['Tables']['Unit']['Row']
type UnitStatus = Database['public']['Enums']['UnitStatus']

const statusColors: Record<UnitStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  OCCUPIED: 'default',
  VACANT: 'secondary', 
  MAINTENANCE: 'destructive',
  RESERVED: 'outline'
}

export const unitColumns: ColumnDef<UnitRow>[] = [
  {
    accessorKey: 'unitNumber',
    header: 'Unit #',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('unitNumber')}</div>
    ),
  },
  {
    accessorKey: 'bedrooms',
    header: 'Beds',
    cell: ({ row }) => (
      <div className="text-center">{row.getValue('bedrooms')}</div>
    ),
  },
  {
    accessorKey: 'bathrooms', 
    header: 'Baths',
    cell: ({ row }) => (
      <div className="text-center">{row.getValue('bathrooms')}</div>
    ),
  },
  {
    accessorKey: 'rent',
    header: 'Rent',
    cell: ({ row }) => {
      const rent = parseFloat(row.getValue('rent'))
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(rent)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as UnitStatus
      return (
        <Badge variant={statusColors[status]} className="capitalize">
          {status.toLowerCase()}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Edit action placeholder
              // TODO: Implement edit functionality
            }}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // View details action placeholder  
              // TODO: Implement view functionality
            }}
          >
            View
          </Button>
        </div>
      )
    },
  },
]