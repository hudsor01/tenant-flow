'use client'

import { useQuery } from '@tanstack/react-query'
import { tenantsApi } from '@/lib/api-client'
import {
  Table,
 TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TenantWithLeaseInfo } from '@repo/shared'
import { TenantActionButtons } from './tenant-action-buttons'

export function TenantDataTable() {
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list()
  })

  if (isLoading) {
    return <div>Loading tenants...</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Rent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant: TenantWithLeaseInfo) => (
          <TableRow key={tenant.id}>
            <TableCell className="font-medium">{tenant.name}</TableCell>
            <TableCell>{tenant.email}</TableCell>
            <TableCell>{tenant.property?.name || 'No property'}</TableCell>
            <TableCell>{tenant.unit?.unitNumber || 'No unit'}</TableCell>
            <TableCell>
              {tenant.monthlyRent ? `$${tenant.monthlyRent.toLocaleString()}` : 'N/A'}
            </TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs ${
                tenant.leaseStatus === 'active'
                  ? 'bg-[var(--color-system-green-10)] text-[var(--color-system-green)]'
                  : 'bg-[var(--color-fill-tertiary)] text-[var(--color-label-secondary)]'
              }`}>
                {tenant.leaseStatus || 'No lease'}
              </span>
            </TableCell>
            <TableCell>
              <TenantActionButtons tenant={tenant} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
