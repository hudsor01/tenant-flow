'use client'

import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, UserPlus } from 'lucide-react'
import { useMemo, memo } from 'react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, EmptyMedia } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { tenantsApi } from '@/lib/api-client'
import { tenantKeys } from '@/hooks/api/use-tenant'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'TenantsTable' })

import type { TenantWithLeaseInfo } from '@repo/shared/types/core'

interface TenantRowProps {
  tenant: TenantWithLeaseInfo;
  deleteTenant: {
    mutate: (id: string) => void;
    isPending: boolean;
  };
}

const TenantRow = memo(({ tenant, deleteTenant }: TenantRowProps) => {
  return (
    <TableRow key={tenant.id}>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{tenant.name}</span>
          <span className="text-sm text-muted-foreground">{tenant.email}</span>
        </div>
      </TableCell>
      <TableCell className="hidden xl:table-cell">
        {tenant.property?.name ? (
          <div className="flex flex-col">
            <span>{tenant.property.name}</span>
            <span className="text-sm text-muted-foreground">
              {tenant.property.city}, {tenant.property.state}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">No property assigned</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge variant={tenant.paymentStatus === 'Overdue' ? 'destructive' : tenant.paymentStatus === 'Current' ? 'secondary' : 'outline'}>
            {tenant.paymentStatus}
          </Badge>
          <Badge variant="outline">{tenant.leaseStatus}</Badge>
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {tenant.currentLease ? (
          <div className="flex flex-col">
            <span>#{tenant.currentLease.id.slice(0, 8)}</span>
            <span className="text-sm text-muted-foreground">
              {tenant.leaseStart
                ? new Date(tenant.leaseStart).toLocaleDateString()
                : 'Start TBD'}{' '}
              -{' '}
              {tenant.leaseEnd
                ? new Date(tenant.leaseEnd).toLocaleDateString()
                : 'End TBD'}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">No active lease</span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {tenant.monthlyRent
          ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(tenant.monthlyRent)
          : '-'}
      </TableCell>
      <TableCell className="flex items-center justify-end gap-1 text-right">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/(protected)/owner/tenants/${tenant.id}`}>
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/(protected)/owner/tenants/${tenant.id}/edit`}>
            Edit
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete tenant</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete tenant</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete{' '}
                <strong>{tenant.name}</strong> and remove associated leases and
                payment history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteTenant.isPending}
                onClick={() => deleteTenant.mutate(tenant.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteTenant.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
});
TenantRow.displayName = 'TenantRow';

export const TenantsTable = memo(() => {
  const queryClient = useQueryClient()
  const { data: tenants, isLoading, isError } = useQuery({
    queryKey: tenantKeys.list(),
    queryFn: () => tenantsApi.list()
  })

  const deleteTenant = useMutation({
    mutationFn: (id: string) => tenantsApi.remove(id),
    onSuccess: (_result: void, variables) => {
      // Remove tenant from list cache without refetching
      queryClient.setQueryData(tenantKeys.list(), (old: TenantWithLeaseInfo[] | undefined) => {
        if (!Array.isArray(old)) return old
        const idToRemove = variables as string
        return old.filter((t: TenantWithLeaseInfo) => t.id !== idToRemove)
      })
      toast.success('Tenant deleted successfully')
    },
    onError: error => {
      toast.error('Failed to delete tenant')
      logger.error('Failed to delete tenant', { action: 'deleteTenant' }, error)
    }
  })

  const sortedTenants = useMemo(() => {
    if (!tenants || !Array.isArray(tenants)) return []
    return [...tenants].sort((a, b) => a.name.localeCompare(b.name))
  }, [tenants])

  if (isError) {
    return (
      <CardLayout
        title="Tenants"
        description="Manage your tenants and their lease information"
      >
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-destructive">
          There was a problem loading tenants. Please try again.
        </div>
      </CardLayout>
    )
  }

  const footer = (
    <Button asChild>
      <Link href="/(protected)/owner/tenants/new">
        <UserPlus className="size-4" />
        Add Tenant
      </Link>
    </Button>
  )

  if (!sortedTenants.length) {
    return (
      <CardLayout
        title="Tenants"
        description="Manage your tenants and their lease information"
        footer={footer}
        isLoading={isLoading}
      >
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon" />
            <EmptyTitle>No tenants yet</EmptyTitle>
            <EmptyDescription>
              Start by creating your first tenant to manage leases and payments.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/(protected)/owner/tenants/new">
                <UserPlus className="size-4" />
                Create tenant
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </CardLayout>
    )
  }

 return (
    <CardLayout
      title="Tenants"
      description="Track tenant status, leases, and payments"
      footer={footer}
      isLoading={isLoading}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead className="hidden xl:table-cell">Property</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Lease</TableHead>
              <TableHead className="hidden lg:table-cell">Rent</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTenants.map(tenant => (
              <TenantRow key={tenant.id} tenant={tenant} deleteTenant={deleteTenant} />
            ))}
          </TableBody>
        </Table>
      </div>
    </CardLayout>
  )
});
TenantsTable.displayName = 'TenantsTable';
